/* ============================================================
   NS Turing - Google Gemini Image Provider
   Uses provider-specific apiKey + apiUrl from settings.
   ============================================================ */

var GeminiProvider = (function () {
    function GeminiProvider() {}
    GeminiProvider.prototype = Object.create(window.ImageProvider.prototype);
    GeminiProvider.prototype.constructor = GeminiProvider;

    GeminiProvider.prototype.name = "gemini";

    GeminiProvider.prototype.getCapabilities = function () {
        return {
            supportsResolution: false,
            supportsMultipleRefs: true,
            maxRefImages: 14
        };
    };

    /**
     * Generate image using Gemini generateContent API.
     * @param {Object} params
     * @param {string} params.apiKey - Provider API key
     * @param {string} params.apiUrl - Provider base URL
     * @param {string} params.model - Model ID
     * @param {string} params.prompt - Text prompt
     * @param {string[]} params.referenceImages - Array of data URLs
     */
    GeminiProvider.prototype.generateImage = async function (params) {
        var apiKey = params.apiKey;
        var baseUrl = params.apiUrl;
        var model = params.model || "gemini-3-pro-image-preview";
        var prompt = params.prompt;
        var referenceImages = params.referenceImages || [];
        var canvasW = params.canvasWidth || 1024;
        var canvasH = params.canvasHeight || 1024;

        if (!apiKey) {
            throw new Error("Google API Key 未设置，请在设置中配置");
        }

        // Normalize baseUrl (strip trailing slash)
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.slice(0, -1);
        }

        // Build size hint for prompt
        var sizeHint = "";
        if (canvasW && canvasH) {
            var ratio = canvasW / canvasH;
            var orientation;
            if (ratio > 1.3) {
                orientation = "横版";
            } else if (ratio < 0.77) {
                orientation = "竖版";
            } else {
                orientation = "正方形";
            }
            sizeHint = "输出图片尺寸应为" + orientation + canvasW + "x" + canvasH + "。";
        }

        // Build parts array
        var parts = [];

        // Add reference images first
        for (var i = 0; i < referenceImages.length; i++) {
            var rawBase64 = window.dataUrlToRawBase64(referenceImages[i]);
            var mimeType = window.getMimeType(referenceImages[i]);
            // Log ref image info for debugging
            var refTotalLen = referenceImages[i].length;
            var refBase64Len = rawBase64.length;
            var refSizeKB = Math.round(refBase64Len * 0.75 / 1024);
            console.log("[Gemini] Ref #" + (i + 1) + ": mime=" + mimeType + ", dataUrl=" + refTotalLen + " chars, base64=" + refBase64Len + " chars, ~" + refSizeKB + " KB");
            parts.push({
                inlineData: { mimeType: mimeType, data: rawBase64 }
            });
        }

        // Add text prompt with size instruction
        parts.push({
            text: prompt + "\n\n请根据以上参考图生成一张新图片，保持与参考图一致的风格和构图。" + sizeHint
        });

        console.log("[Gemini] Prompt with size hint: " + sizeHint);

        var body = {
            contents: [{ parts: parts }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
        };

        var url = baseUrl + "/v1beta/models/" + model + ":generateContent?key=" + apiKey;

        var response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            var error = await response.text();
            throw new Error("Gemini API error (" + response.status + "): " + error);
        }

        var result = await response.json();
        var images = [];

        // Parse response
        if (result.candidates) {
            for (var i = 0; i < result.candidates.length; i++) {
                var candidate = result.candidates[i];
                if (candidate.content && candidate.content.parts) {
                    for (var j = 0; j < candidate.content.parts.length; j++) {
                        var part = candidate.content.parts[j];
                        if (part.inlineData && part.inlineData.data) {
                            var mt = part.inlineData.mimeType || "image/png";
                            images.push("data:" + mt + ";base64," + part.inlineData.data);
                        }
                    }
                }
            }
        }

        if (images.length === 0) {
            var finishReason = result.candidates && result.candidates[0] ? result.candidates[0].finishReason : null;
            var blockReason = result.promptFeedback ? result.promptFeedback.blockReason : null;
            if (blockReason) {
                throw new Error("Gemini 内容被拦截: " + blockReason);
            }
            if (finishReason && finishReason !== "STOP") {
                throw new Error("Gemini 生成未完成: " + finishReason);
            }
            throw new Error("Gemini 未返回任何图片。提示词可能被安全过滤拦截。");
        }

        return images;
    };

    return GeminiProvider;
})();

// Expose globally for non-module script loading (UXP compatibility)
window.GeminiProvider = GeminiProvider;
