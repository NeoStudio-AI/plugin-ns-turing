/* ============================================================
   NS Turing - Model Selector Component (Custom Dropdown)
   Replaces native <select> to avoid UXP z-index occlusion.
   ============================================================ */

/**
 * Initialize custom model picker dropdown.
 */
function initModelSelector() {
    const els = window.__els;
    if (!els) return;

    const picker = document.getElementById("model-picker");
    const btn = els.modelPickerBtn;
    const dropdown = els.modelPickerDropdown;
    const label = els.modelPickerLabel;
    if (!picker || !btn || !dropdown || !label) return;

    // Build dropdown items from derived flat models (from providers)
    function getModels() {
        var config = window.__turingConfig || window.CONFIG;
        var providers = config.providers || [];
        return window.deriveFlatModels(providers);
    }
    var models = getModels();

    /** Find a flat model entry matching a composite key "providerId|modelId" */
    function findModelByKey(key) {
        if (!key) return null;
        var providers = (window.__turingConfig || window.CONFIG).providers || [];
        var parsed = window.parseModelKey(key, providers);
        if (!parsed.providerId) return null;
        return getModels().find(function (m) {
            return m.providerId === parsed.providerId && m.id === parsed.modelId;
        });
    }

    /** Check if a flat model matches a composite key */
    function modelMatchesKey(model, key) {
        if (!key || !model) return false;
        var providers = (window.__turingConfig || window.CONFIG).providers || [];
        var parsed = window.parseModelKey(key, providers);
        return model.providerId === parsed.providerId && model.id === parsed.modelId;
    }

    var selectedModel = window.state.get("selectedModel") || window.CONFIG.selectedModel;

    function renderItems() {
        var currentModels = getModels();
        var current = window.state.get("selectedModel");
        dropdown.innerHTML = "";

        currentModels.forEach(function (m) {
            var item = document.createElement("div");
            item.className = "model-picker-item";
            if (modelMatchesKey(m, current)) {
                item.classList.add("selected");
            }

            var nameSpan = document.createElement("span");
            nameSpan.textContent = m.name;

            var tag = document.createElement("span");
            tag.className = "model-provider-tag";
            tag.textContent = m.providerName;

            item.appendChild(nameSpan);
            item.appendChild(tag);

            (function (model) {
                item.addEventListener("click", function () {
                    var compositeKey = window.composeModelKey(model.providerId, model.id);
                    window.state.set("selectedModel", compositeKey);
                    console.log("[ModelSelector] Changed to:", compositeKey);
                    closeDropdown();
                });
            })(m);

            dropdown.appendChild(item);
        });
    }

    function openDropdown() {
        renderItems();
        dropdown.classList.remove("hidden");
        picker.classList.add("open");
    }

    function closeDropdown() {
        dropdown.classList.add("hidden");
        picker.classList.remove("open");
    }

    // Toggle on button click
    btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (dropdown.classList.contains("hidden")) {
            openDropdown();
        } else {
            closeDropdown();
        }
    });

    // Close when clicking outside
    document.addEventListener("click", function (e) {
        if (!picker.contains(e.target)) {
            closeDropdown();
        }
    });

    // Get display label for the selected model (just model name, provider shown in tag)
    function getDisplayLabel(model) {
        if (!model) return null;
        return model.name;
    }

    // Update label when state changes
    window.state.on("selectedModel", function (value) {
        var model = findModelByKey(value);
        label.textContent = model ? getDisplayLabel(model) : value;
        // Re-render if dropdown is open
        if (!dropdown.classList.contains("hidden")) {
            renderItems();
        }
    });

    // Re-render when models list changes (e.g., user added a model in settings)
    window.state.on("models", function () {
        models = getModels();
        var currentKey = window.state.get("selectedModel");
        var model = findModelByKey(currentKey);
        label.textContent = model ? getDisplayLabel(model) : currentKey;
        if (!dropdown.classList.contains("hidden")) {
            renderItems();
        }
    });

    // Set initial label
    var initialModel = findModelByKey(selectedModel);
    label.textContent = initialModel ? getDisplayLabel(initialModel) : selectedModel;
}

// Expose globally for non-module script loading (UXP compatibility)
window.initModelSelector = initModelSelector;
