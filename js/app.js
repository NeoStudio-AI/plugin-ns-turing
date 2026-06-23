/* ============================================================
   NS Turing - Application Controller
   Orchestrates the complete image generation flow:
     UI Events → Reference Collection → API Dispatch → PS Placement
   ============================================================ */

/**
 * Initialize the app: start all UI components and wire up events.
 */
function initApp() {
    // Detect PS theme first (adds .theme-light class to body if needed)
    window.initTheme();
    // Swap all icon srcs to match theme (dark/light SVG variants)
    window.updateIconSrcs();

    // Initialize UI components
    window.initPrompt();
    window.initModelSelector();
    window.initReferences();
    window.initLayersPicker();
    window.initProgress();
    window.initSettings();

    // Wire up Generate button
    const btnGenerate = window.__els?.btnGenerate;
    if (btnGenerate) {
        btnGenerate.addEventListener("click", () => handleGenerate());
    }

    // Monitor generating state to disable button
    window.state.on("generating", (isGenerating) => {
        if (btnGenerate) {
            btnGenerate.classList.toggle("disabled", isGenerating);
            btnGenerate.textContent = isGenerating ? "生成中..." : "生成图片";
        }
    });

    // Keyboard shortcut: Ctrl+Enter to generate
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            handleGenerate();
        }
    });

    // Status display
    window.state.on("status", (msg) => {
        updateStatus(msg, window.state.get("statusType") || "");
    });
    window.state.on("statusType", (type) => {
        updateStatus(window.state.get("status"), type);
    });

    console.log("[App] Initialized");
}

/**
 * Set status text and type in the status bar.
 */
function updateStatus(msg, type) {
    const statusBar = window.__els?.statusBar;
    if (!statusBar) return;

    statusBar.textContent = msg || "";
    statusBar.className = "status-bar";
    if (type === "error") statusBar.classList.add("error");
    if (type === "success") statusBar.classList.add("success");
}

/**
 * Main generate flow: called when user clicks "Generate" or presses Ctrl+Enter.
 */
async function handleGenerate() {
    // Prevent duplicate invocations
    if (window.state.get("generating")) return;

    try {
        // === 1. Validation ===
        const prompt = (window.state.get("prompt") || "").trim();
        if (!prompt) {
            setError("请输入提示词 (Prompt)");
            focusPrompt();
            return;
        }

        // Validate prompt length
        const promptUnits = window.countPromptUnits(prompt);
        const maxUnits = window.CONFIG.maxPromptWords;
        if (promptUnits > maxUnits) {
            setError("提示词过长（" + promptUnits + " / " + maxUnits + "），请精简描述以确保生成质量");
            focusPrompt();
            return;
        }

        const doc = window.ps.getActiveDocument();
        if (!doc) {
            setError("请先打开一个 Photoshop 文档");
            return;
        }

        // Read canvas dimensions to guide AI output size
        const canvasWidth = doc.width;
        const canvasHeight = doc.height;
        console.log(`[App] Canvas: ${canvasWidth}x${canvasHeight}`);

        // === 2. Collect Reference Images ===
        const allRefs = await collectReferenceImages();
        if (allRefs.length > window.CONFIG.maxReferenceImages) {
            setError(`参考图数量 (${allRefs.length}) 超过上限 (${window.CONFIG.maxReferenceImages})`);
            return;
        }

        // Validate image sizes
        for (let i = 0; i < allRefs.length; i++) {
            const validation = window.validateImageSize(allRefs[i], window.CONFIG.maxImageSizeMB);
            if (!validation.valid) {
                setError(`参考图 #${i + 1} ` + validation.message);
                return;
            }
        }

        // === 3. Start Generation ===
        window.state.set("generating", true);
        window.state.set("progress", 5);
        setStatus("正在收集参考图...");

        const model = window.state.get("selectedModel") || window.CONFIG.selectedModel;

        console.log(`[App] Generating: model=${model}, prompt="${prompt.slice(0, 50)}...", refs=${allRefs.length}`);

        // === 4. Call AI API ===
        window.state.set("progress", 15);
        setStatus("正在调用 AI 模型...");

        const images = await window.Turing_dispatch({
            model: model,
            prompt: prompt,
            referenceImages: allRefs,
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight
        });

        if (!images || images.length === 0) {
            throw new Error("AI 模型未返回任何图片");
        }

        console.log(`[App] Generated ${images.length} image(s)`);

        // === 5. Place in Photoshop ===
        window.state.set("progress", 70);
        setStatus(`正在将 ${images.length} 张图片置入到文档...`);

        const placed = await window.ps.addImagesAsSmartObjects(images);

        window.state.set("progress", 100);

        if (placed > 0) {
            setStatus(`成功生成 ${placed} 张图片，已置入为智能对象图层`, "success");
            window.state.set("generatedImages", images);
        } else if (placed === 0 && images.length > 0) {
            setError("图片生成成功，但置入文档失败。图片已保存到临时文件。");
        }

    } catch (e) {
        console.error("[App] Generation failed:", e);
        handleGenerationError(e);
    } finally {
        window.state.set("generating", false);

        // Auto-hide progress after a delay
        setTimeout(() => {
            if (!window.state.get("generating")) {
                window.state.set("progress", 0);
            }
        }, 2000);
    }
}

/**
 * Collect all reference images from enabled sources.
 * Order: canvas (optional) → uploaded refs → layer refs
 *
 * @returns {Promise<string[]>} Array of base64 data URL strings
 */
async function collectReferenceImages() {
    const refs = [];
    const maxRefs = window.CONFIG.maxReferenceImages;

    // 1. Canvas as reference
    if (window.state.get("canvasAsRef")) {
        setStatus("正在导出画布内容...");
        window.state.set("progress", 10);

        const canvasBase64 = await window.ps.captureCanvasAsBase64();
        if (canvasBase64) {
            refs.push(canvasBase64);
            console.log("[App] Canvas captured as reference");
        } else {
            console.warn("[App] Failed to capture canvas");
        }
    }

    if (refs.length >= maxRefs) return refs;

    // 2. Uploaded reference images
    const uploadedRefs = window.state.get("uploadedRefs") || [];
    for (const ref of uploadedRefs) {
        if (refs.length >= maxRefs) break;
        if (ref.dataUrl) {
            refs.push(ref.dataUrl);
        }
    }

    if (refs.length >= maxRefs) return refs;

    // 3. Selected layer references
    if (window.state.get("layersAsRef") && window.state.get("selectedLayerIds")?.length > 0) {
        const layerIds = window.state.get("selectedLayerIds");
        setStatus(`正在导出 ${layerIds.length} 个图层...`);

        for (const layerId of layerIds) {
            if (refs.length >= maxRefs) break;

            const layerBase64 = await window.ps.exportLayerAsBase64(layerId);
            if (layerBase64) {
                refs.push(layerBase64);
            } else {
                console.warn(`[App] Failed to export layer ${layerId}`);
            }
        }
    }

    return refs;
}

/**
 * Handle errors during generation.
 */
function handleGenerationError(error) {
    let message = error.message || "未知错误";

    // Categorize by error type for better UX
    if (message.includes("401") || message.includes("Unauthorized")) {
        message = "API Key 无效或未设置，请在设置中配置。";
    } else if (message.includes("API Key 未设置")) {
        message = "API Key 无效或未设置，请在设置中配置。";
    } else if (message.includes("400") && message.includes("Base64")) {
        message = "参考图数据处理失败，请重试。";
    } else if (message.includes("429") || message.includes("Rate limit")) {
        message = "API 请求频率限制，请稍后重试。";
    } else if (message.includes("NetworkError") || message.includes("Failed to fetch") || message.includes("网络")) {
        message = "网络连接失败，请检查网络设置。";
    } else if (message.includes("拦截") || message.includes("SAFETY") || message.includes("blocked")) {
        message = "AI 模型因安全策略拒绝了该请求，请修改提示词后重试。";
    }

    setError(message);
}

/**
 * Set error state and update UI.
 */
function setError(message) {
    window.state.set("status", message);
    window.state.set("statusType", "error");
}

/**
 * Set status with type.
 */
function setStatus(message, type = "") {
    window.state.set("status", message);
    window.state.set("statusType", type);
}

/**
 * Focus the prompt input field.
 */
function focusPrompt() {
    const el = window.__els?.promptInput;
    if (el) {
        el.focus();
        el.select();
    }
}

// Expose globally for non-module script loading (UXP compatibility)
window.initApp = initApp;
