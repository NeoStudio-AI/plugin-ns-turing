/* ============================================================
   NS Turing - Prompt Input Component
   ============================================================ */

/**
 * Initialize prompt input: bind input event to state.
 */
function initPrompt() {
    const el = window.__els.promptInput;
    if (!el) return;

    el.addEventListener("input", () => {
        window.state.set("prompt", el.value);
    });

    // Sync from state to DOM
    window.state.on("prompt", (value) => {
        if (el.value !== value) {
            el.value = value;
        }
    });
}

// Expose globally for non-module script loading (UXP compatibility)
window.initPrompt = initPrompt;
