/* ============================================================
   NS Turing - Panel (initializes DOM references & global helpers)
   ============================================================ */

/**
 * Returns a DOM element by ID, with a warning if not found.
 */
function getEl(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`[Panel] Element #${id} not found`);
    return el;
}

/**
 * Initialize panel: cache all DOM references on a global object
 * so other modules can use them without repeated getElementById.
 */
function initPanel() {
    window.__els = {
        promptInput: getEl("prompt-input"),
        // Spectrum sp-picker model selector
        modelPicker: getEl("model-picker"),
        modelMenu: getEl("model-menu"),
        chkCanvasRef: getEl("chk-canvas-ref"),
        chkLayerRef: getEl("chk-layer-ref"),
        layerPickerContainer: getEl("layer-picker-container"),
        layerList: getEl("layer-list"),
        btnRefreshLayers: getEl("btn-refresh-layers"),
        refGrid: getEl("ref-grid"),
        refCount: getEl("ref-count"),
        btnUploadRef: getEl("btn-upload-ref"),
        refFileInput: getEl("ref-file-input"),
        progressContainer: getEl("progress-container"),
        progressBarFill: getEl("progress-bar-fill"),
        progressText: getEl("progress-text"),
        btnGenerate: getEl("btn-generate"),
        statusBar: getEl("status-bar"),
        btnSettings: getEl("btn-settings"),
        settingsPage: getEl("settings-page"),
        btnBackSettings: getEl("btn-back-settings")
    };

    console.log("[Panel] DOM references initialized");
}

// Expose globally for non-module script loading (UXP compatibility)
window.initPanel = initPanel;
