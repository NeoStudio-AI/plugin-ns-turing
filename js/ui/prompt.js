/* ============================================================
   NS Turing - Prompt Input Component
   ============================================================ */

/**
 * Count prompt "units": English words count as 1 each,
 * CJK characters (Chinese/Japanese/Korean) count as 1 each.
 * Mixed text: CJK chars + remaining English words.
 * @param {string} text
 * @returns {number}
 */
function countPromptUnits(text) {
    if (!text || !text.trim()) return 0;

    // Count CJK characters (Chinese, Japanese, Korean)
    var cjkRe = /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g;
    var cjkMatch = text.match(cjkRe);
    var cjkCount = cjkMatch ? cjkMatch.length : 0;

    // Remove CJK characters and punctuation, count remaining English words
    var englishPart = text.replace(cjkRe, " ");
    var words = englishPart.split(/\s+/).filter(function (w) {
        // Only count segments that contain at least one letter or digit
        return /[a-zA-Z0-9]/.test(w);
    });

    return cjkCount + words.length;
}

/**
 * Update the prompt counter UI based on current text.
 * @param {string} text
 */
function updatePromptCounter(text) {
    var counterEl = document.getElementById("prompt-counter");
    if (!counterEl) return;

    var count = countPromptUnits(text);
    var max = window.CONFIG.maxPromptWords;

    counterEl.textContent = count + " / " + max;

    // Color feedback
    counterEl.classList.remove("warn", "over");
    var ratio = count / max;
    if (ratio >= 1) {
        counterEl.classList.add("over");
    } else if (ratio >= 0.85) {
        counterEl.classList.add("warn");
    }
}

/**
 * Initialize prompt input using sp-textarea (UXP native component).
 * sp-textarea avoids the CEF textarea 256-char limit.
 */
function initPrompt() {
    var el = window.__els.promptInput;
    if (!el) return;

    // Helper: get current value (sp-textarea supports .value property)
    function getValue() {
        return el.value || "";
    }

    // Input: sync to state + update counter
    el.addEventListener("input", function () {
        var text = getValue();
        window.state.set("prompt", text);
        updatePromptCounter(text);
    });

    // Initial counter
    updatePromptCounter(getValue());
}

// Expose globally for non-module script loading (UXP compatibility)
window.initPrompt = initPrompt;
window.countPromptUnits = countPromptUnits;
