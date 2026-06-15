/* ============================================================
   NS Turing - Progress Component
   ============================================================ */

/**
 * Initialize progress bar: react to generating and progress state.
 */
function initProgress() {
    const els = window.__els;
    if (!els) return;

    // Show/hide progress container
    window.state.on("generating", (isGenerating) => {
        if (els.progressContainer) {
            els.progressContainer.classList.toggle("hidden", !isGenerating);
        }
        if (!isGenerating) {
            setProgressBar(0);
        }
    });

    // Update progress bar fill and text
    window.state.on("progress", (value) => {
        setProgressBar(value);
    });
}

/**
 * Set progress bar percentage.
 */
function setProgressBar(percent) {
    const els = window.__els;
    if (!els) return;

    const pct = Math.min(100, Math.max(0, percent));

    if (els.progressBarFill) {
        els.progressBarFill.style.width = pct + "%";
    }
    if (els.progressText) {
        els.progressText.textContent = Math.round(pct) + "%";
    }
}

// Expose globally for non-module script loading (UXP compatibility)
window.initProgress = initProgress;
