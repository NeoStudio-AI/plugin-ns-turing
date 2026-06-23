/* ============================================================
   NS Turing - Generate Flow Orchestrator
   ============================================================ */

import { getActiveDocument, captureCanvasAsBase64, exportLayerAsBase64, addImagesAsSmartObjects } from "../photoshop.js";
import { dispatch as apiDispatch } from "../api/dispatcher.js";
import { validateImageSize } from "./image.js";

/**
 * Count prompt units (CJK chars + English words).
 */
function countPromptUnits(text) {
    if (!text || !text.trim()) return 0;
    var cjkRe = /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g;
    var cjkMatch = text.match(cjkRe);
    var cjkCount = cjkMatch ? cjkMatch.length : 0;
    var englishPart = text.replace(cjkRe, " ");
    var words = englishPart.split(/\s+/).filter(function (w) { return /[a-zA-Z0-9]/.test(w); });
    return cjkCount + words.length;
}

/**
 * Main generate function.
 * @param {Object} params
 * @param {Object} params.state - current app state
 * @param {Function} params.onStatus - (message, type) => void
 * @param {Function} params.onProgress - (percent) => void
 * @param {Function} params.onComplete - (images, placedCount) => void
 * @param {Function} params.onError - (message) => void
 */
export async function runGenerate({ state, onStatus, onProgress, onComplete, onError }) {
    try {
        // === 1. Validate prompt ===
        var prompt = (state.prompt || "").trim();
        if (!prompt) {
            onError("请输入提示词 (Prompt)");
            return;
        }

        var maxUnits = (state.turingConfig && state.turingConfig.maxPromptWords) || 110;
        var promptUnits = countPromptUnits(prompt);
        if (promptUnits > maxUnits) {
            onError("提示词过长（" + promptUnits + " / " + maxUnits + "），请精简描述以确保生成质量");
            return;
        }

        // === 2. Validate document ===
        var doc = getActiveDocument();
        if (!doc) {
            onError("请先打开一个 Photoshop 文档");
            return;
        }

        var canvasWidth = doc.width;
        var canvasHeight = doc.height;
        var maxRefs = (state.turingConfig && state.turingConfig.maxReferenceImages) || 10;
        var maxImageMB = (state.turingConfig && state.turingConfig.maxImageSizeMB) || 20;

        // === 3. Collect reference images ===
        onProgress(5);
        onStatus("正在收集参考图...");
        var refs = await collectRefs(state, maxRefs, onProgress, onStatus);

        if (refs.length > maxRefs) {
            onError("参考图数量 (" + refs.length + ") 超过上限 (" + maxRefs + ")");
            return;
        }

        // Validate image sizes
        for (var ri = 0; ri < refs.length; ri++) {
            var validation = validateImageSize(refs[ri], maxImageMB);
            if (!validation.valid) {
                onError("参考图 #" + (ri + 1) + " " + validation.message);
                return;
            }
        }

        // === 4. Call AI API ===
        onProgress(15);
        onStatus("正在调用 AI 模型...");

        var model = state.selectedModel;
        var config = state.turingConfig;
        if (!config) { onError("配置未加载"); return; }

        console.log("[Generate] model=" + model + ", promptLen=" + prompt.length + ", refs=" + refs.length + ", canvas=" + canvasWidth + "x" + canvasHeight);

        var images = await apiDispatch({
            model: model,
            prompt: prompt,
            referenceImages: refs,
            config: config,
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight
        });

        if (!images || images.length === 0) {
            onError("AI 模型未返回任何图片");
            return;
        }

        console.log("[Generate] Got " + images.length + " image(s)");

        // === 5. Place in Photoshop ===
        onProgress(70);
        onStatus("正在将 " + images.length + " 张图片置入到文档...");

        var placed = await addImagesAsSmartObjects(images);
        onProgress(100);

        if (placed > 0) {
            onComplete(images, placed);
        } else if (placed === 0 && images.length > 0) {
            onError("图片生成成功，但置入文档失败");
        }

    } catch (e) {
        console.error("[Generate] Failed:", e);
        onError(handleError(e));
    }
}

/**
 * Collect reference images from enabled sources.
 * Order: canvas → uploaded refs → selected layers
 */
async function collectRefs(state, maxRefs, onProgress, onStatus) {
    var refs = [];

    // 1. Canvas as reference
    if (state.canvasAsRef) {
        onProgress(10);
        onStatus("正在导出画布内容...");
        var canvasBase64 = await captureCanvasAsBase64();
        if (canvasBase64) {
            refs.push(canvasBase64);
            console.log("[Generate] Canvas captured");
        }
    }
    if (refs.length >= maxRefs) return refs;

    // 2. Uploaded reference images
    var uploadedRefs = state.uploadedRefs || [];
    for (var u = 0; u < uploadedRefs.length; u++) {
        if (refs.length >= maxRefs) break;
        if (uploadedRefs[u].dataUrl) {
            refs.push(uploadedRefs[u].dataUrl);
        }
    }
    if (refs.length >= maxRefs) return refs;

    // 3. Selected layer references
    if (state.layersAsRef && state.selectedLayerIds && state.selectedLayerIds.length > 0) {
        var layerIds = state.selectedLayerIds;
        onStatus("正在导出 " + layerIds.length + " 个图层...");
        for (var l = 0; l < layerIds.length; l++) {
            if (refs.length >= maxRefs) break;
            var layerBase64 = await exportLayerAsBase64(layerIds[l]);
            if (layerBase64) {
                refs.push(layerBase64);
            }
        }
    }

    return refs;
}

/**
 * Translate API errors to user-friendly messages.
 */
function handleError(error) {
    var msg = error.message || "未知错误";

    if (msg.includes("401") || msg.includes("Unauthorized")) {
        return "API Key 无效或未设置，请在设置中配置";
    }
    if (msg.includes("API Key 未设置")) {
        return "API Key 无效或未设置，请在设置中配置";
    }
    if (msg.includes("400") && msg.includes("Base64")) {
        return "参考图数据处理失败，请重试";
    }
    if (msg.includes("429") || msg.includes("Rate limit")) {
        return "API 请求频率限制，请稍后重试";
    }
    if (msg.includes("NetworkError") || msg.includes("Failed to fetch") || msg.includes("网络")) {
        return "网络连接失败，请检查网络设置";
    }
    if (msg.includes("拦截") || msg.includes("SAFETY") || msg.includes("blocked")) {
        return "AI 模型因安全策略拒绝了该请求，请修改提示词后重试";
    }
    return msg;
}
