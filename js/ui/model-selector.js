/* ============================================================
   NS Turing - Model Selector (Spectrum sp-picker)
   ============================================================ */

/**
 * Initialize model picker using Spectrum sp-picker + sp-menu-item.
 */
function initModelSelector() {
    var picker = document.getElementById("model-picker");
    var menu = document.getElementById("model-menu");
    if (!picker || !menu) return;

    /** Get flat model list from providers */
    function getModels() {
        var config = window.__turingConfig || window.CONFIG;
        var providers = config.providers || [];
        return window.deriveFlatModels(providers);
    }

    /** Find a model entry matching a composite key "providerId|modelId" */
    function findModelByKey(key) {
        if (!key) return null;
        var providers = (window.__turingConfig || window.CONFIG).providers || [];
        var parsed = window.parseModelKey(key, providers);
        if (!parsed.providerId) return null;
        return getModels().find(function (m) {
            return m.providerId === parsed.providerId && m.id === parsed.modelId;
        });
    }

    /** Build display text: "ModelName · ProviderName" */
    function itemLabel(model) {
        return model.name + " · " + model.providerName;
    }

    /** Build composite key from model entry */
    function modelKey(model) {
        return window.composeModelKey(model.providerId, model.id);
    }

    /** Render all model items into the menu */
    function render() {
        var models = getModels();
        var currentKey = window.state.get("selectedModel");
        menu.innerHTML = "";

        models.forEach(function (model) {
            var item = document.createElement("sp-menu-item");
            item.setAttribute("value", modelKey(model));
            item.textContent = itemLabel(model);
            if (modelKey(model) === currentKey) {
                item.setAttribute("selected", "");
            }
            menu.appendChild(item);
        });

        // Sync picker value to match selected
        if (currentKey) {
            picker.value = currentKey;
        }
    }

    // --- Initial render ---
    render();

    // --- Change event: user picks a model ---
    picker.addEventListener("change", function () {
        var value = picker.value;
        if (value && value !== "loading") {
            window.state.set("selectedModel", value);
            console.log("[ModelSelector] Changed to:", value);
        }
    });

    // --- State sync: external changes update picker ---
    window.state.on("selectedModel", function (value) {
        if (picker.value !== value) {
            picker.value = value;
            // Update selected attribute on items
            Array.prototype.forEach.call(menu.children, function (item) {
                if (item.getAttribute("value") === value) {
                    item.setAttribute("selected", "");
                } else {
                    item.removeAttribute("selected");
                }
            });
        }
    });

    // --- Models list changed (e.g., added/removed in settings) ---
    window.state.on("models", function () {
        render();
    });
}

// Expose globally for non-module script loading (UXP compatibility)
window.initModelSelector = initModelSelector;
