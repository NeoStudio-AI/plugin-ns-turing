/* ============================================================
   NS Turing - Settings: Provider Management (Cherry Studio style)
   ============================================================ */

/** Simple UUID generator */
function generateId() {
    return "prov_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

/** Current editing provider ID (null = adding new) */
var editingProviderId = null;

/** Current provider being configured in Step 2 */
var configuringProviderId = null;

/**
 * Initialize settings dialog.
 */
function initSettings() {
    var els = window.__els;
    if (!els) return;

    // Open settings
    if (els.btnSettings) {
        els.btnSettings.addEventListener("click", function () {
            hideProviderForm();
            hideProviderConfigPanel();
            renderProviderList();
            // Show settings page, hide main app
            var settingsPage = document.getElementById("settings-page");
            var app = document.getElementById("app");
            if (settingsPage) settingsPage.classList.remove("hidden");
            if (app) app.classList.add("hidden");
        });
    }

    // Back button — return to main view
    var btnBack = document.getElementById("btn-back-settings");
    if (btnBack) {
        btnBack.addEventListener("click", function () {
            closeSettings();
        });
    }

    // Add provider button (Step 1)
    var btnAdd = document.getElementById("btn-add-provider");
    if (btnAdd) {
        btnAdd.addEventListener("click", function () {
            showProviderForm(null);
        });
    }

    // Cancel provider form
    var btnCancel = document.getElementById("btn-cancel-provider");
    if (btnCancel) {
        btnCancel.addEventListener("click", function () {
            hideProviderForm();
        });
    }

    // Provider type change → update endpoint display
    var selType = document.getElementById("select-provider-type");
    if (selType) {
        selType.addEventListener("change", function () {
            updateEndpointInfo(selType.value);
        });
    }

    // Save provider (Step 1: only name + type)
    var btnSave = document.getElementById("btn-save-provider");
    if (btnSave) {
        btnSave.addEventListener("click", function () {
            handleSaveProvider();
        });
    }

    // === Step 2: Provider Config Panel ===

    // Back to provider list from config panel
    var btnBackList = document.getElementById("btn-back-provider-list");
    if (btnBackList) {
        btnBackList.addEventListener("click", function () {
            hideProviderConfigPanel();
            renderProviderList();
        });
    }

    // Toggle API key visibility (in Step 2 config panel)
    var btnToggleKey = document.getElementById("btn-toggle-apikey");
    if (btnToggleKey) {
        btnToggleKey.addEventListener("click", function () {
            toggleApiKeyVisibility();
        });
    }

    // Fetch models button
    var btnFetch = document.getElementById("btn-fetch-models");
    if (btnFetch) {
        btnFetch.addEventListener("click", function () {
            handleFetchModels();
        });
    }

    // Save provider config (Step 2)
    var btnSaveConfig = document.getElementById("btn-save-provider-config");
    if (btnSaveConfig) {
        btnSaveConfig.addEventListener("click", function () {
            handleSaveProviderConfig();
        });
    }
}

function closeSettings() {
    // Show main app, hide settings page
    var settingsPage = document.getElementById("settings-page");
    var app = document.getElementById("app");
    if (settingsPage) settingsPage.classList.add("hidden");
    if (app) app.classList.remove("hidden");
    hideProviderForm();
    hideProviderConfigPanel();
    clearSettingsStatus();
}

function clearSettingsStatus() {
    var el = document.getElementById("settings-status");
    if (el) {
        el.textContent = "";
        el.className = "settings-status";
    }
}

function setSettingsStatus(msg, type) {
    var el = document.getElementById("settings-status");
    if (!el) return;
    el.textContent = msg;
    el.className = "settings-status";
    if (type === "error") el.classList.add("error");
    if (type === "success") el.classList.add("success");
}

/* ============================================================
   Provider List
   ============================================================ */

function getProviders() {
    var config = window.__turingConfig || window.CONFIG;
    return config.providers || [];
}

function renderProviderList() {
    var list = document.getElementById("provider-list");
    if (!list) return;

    var providers = getProviders();
    list.innerHTML = "";

    if (providers.length === 0) {
        list.innerHTML = '<div class="provider-empty">暂无服务商，点击下方按钮添加</div>';
        return;
    }

    providers.forEach(function (prov) {
        var typeInfo = window.PROVIDER_TYPE_INFO[prov.type] || {};
        var typeLabel = typeInfo.label || prov.type;
        var hasKey = prov.apiKey && prov.apiKey.length > 0;
        var modelCount = (prov.models || []).filter(function (m) { return m.enabled !== false; }).length;

        var card = document.createElement("div");
        card.className = "provider-card";
        // Click card → Step 2: configure provider
        card.addEventListener("click", function () {
            showProviderConfigPanel(prov.id);
        });

        // Info section
        var info = document.createElement("div");
        info.className = "provider-card-info";

        var nameEl = document.createElement("div");
        nameEl.className = "provider-card-name";
        nameEl.textContent = prov.name;

        var meta = document.createElement("div");
        meta.className = "provider-card-meta";

        var badge = document.createElement("span");
        badge.className = "provider-type-badge";
        badge.textContent = typeLabel;

        var keyStatus = document.createElement("span");
        keyStatus.className = "provider-key-status";
        if (hasKey) {
            keyStatus.classList.add("configured");
            keyStatus.innerHTML = iconSpan('check', 'icon-xs') + ' 已配置密钥';
        } else {
            keyStatus.innerHTML = iconSpan('x-circle', 'icon-xs') + ' 未配置密钥';
        }

        var modelBadge = document.createElement("span");
        modelBadge.className = "provider-model-count";
        modelBadge.textContent = modelCount + " 个模型";

        meta.appendChild(badge);
        meta.appendChild(keyStatus);
        meta.appendChild(modelBadge);
        info.appendChild(nameEl);
        info.appendChild(meta);

        // Actions
        var actions = document.createElement("div");
        actions.className = "provider-card-actions";

        var editBtn = document.createElement("span");
        editBtn.className = "provider-action-btn";
        editBtn.setAttribute("role", "button");
        editBtn.setAttribute("tabindex", "0");
        editBtn.title = "编辑名称/类型";
        editBtn.innerHTML = iconSpan('edit');
        editBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            showProviderForm(prov.id);
        });

        var delBtn = document.createElement("span");
        delBtn.className = "provider-action-btn danger";
        delBtn.setAttribute("role", "button");
        delBtn.setAttribute("tabindex", "0");
        delBtn.title = "删除";
        delBtn.innerHTML = iconSpan('trash');
        delBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            deleteProvider(prov.id);
        });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        card.appendChild(info);
        card.appendChild(actions);
        list.appendChild(card);
    });
}

/* ============================================================
   Provider Form
   ============================================================ */

function showProviderForm(providerId) {
    var form = document.getElementById("provider-form");
    var title = document.getElementById("provider-form-title");
    var inputName = document.getElementById("input-provider-name");
    var selType = document.getElementById("select-provider-type");

    if (!form) return;

    if (providerId) {
        // Edit existing provider name/type
        var providers = getProviders();
        var prov = providers.find(function (p) { return p.id === providerId; });
        if (!prov) return;

        editingProviderId = providerId;
        if (title) title.textContent = "编辑服务商";
        if (inputName) inputName.value = prov.name;
        if (selType) selType.value = prov.type;
    } else {
        // Add new provider (Step 1: only name + type)
        editingProviderId = null;
        if (title) title.textContent = "添加服务商";
        if (inputName) inputName.value = "";
        if (selType) selType.value = "openai";
        // Focus name field
        setTimeout(function () {
            if (inputName) inputName.focus();
        }, 100);
    }

    // Update endpoint display
    if (selType) {
        updateEndpointInfo(selType.value);
    }

    form.classList.remove("hidden");
}

function hideProviderForm() {
    var form = document.getElementById("provider-form");
    if (form) {
        form.classList.add("hidden");
    }
    editingProviderId = null;
    clearSettingsStatus();
}

function updateEndpointInfo(providerType) {
    var info = window.PROVIDER_TYPE_INFO[providerType];
    if (!info) return;

    var codeT2i = document.getElementById("code-t2i-endpoint");
    var codeI2i = document.getElementById("code-i2i-endpoint");
    var linkT2i = document.getElementById("link-t2i-doc");
    var linkI2i = document.getElementById("link-i2i-doc");

    if (codeT2i) codeT2i.textContent = info.endpoints.textToImage || "";
    if (codeI2i) codeI2i.textContent = info.endpoints.imageToImage || "";
    if (linkT2i) linkT2i.href = info.docs.textToImage || "#";
    if (linkI2i) linkI2i.href = info.docs.imageToImage || "#";
}

/* ============================================================
   Save / Delete
   ============================================================ */

async function handleSaveProvider() {
    var inputName = document.getElementById("input-provider-name");
    var selType = document.getElementById("select-provider-type");

    var name = inputName ? inputName.value.trim() : "";
    var type = selType ? selType.value : "openai";

    // Validation
    if (!name) {
        setSettingsStatus("请输入服务商名称", "error");
        if (inputName) inputName.focus();
        return;
    }

    var config = window.__turingConfig;
    if (!config) {
        setSettingsStatus("配置未加载", "error");
        return;
    }
    if (!config.providers) {
        config.providers = [];
    }

    if (editingProviderId) {
        // Update existing provider name/type
        var idx = config.providers.findIndex(function (p) { return p.id === editingProviderId; });
        if (idx >= 0) {
            config.providers[idx].name = name;
            // If type changed, clear old models (they were for the old API type)
            if (config.providers[idx].type !== type) {
                config.providers[idx].type = type;
                config.providers[idx].models = [];
            }
        }
    } else {
        // Create new provider (Step 1: name + type only, no apiKey/apiUrl yet)
        config.providers.push({
            id: generateId(),
            name: name,
            type: type,
            apiKey: "",
            apiUrl: "",
            models: []
        });
    }

    // Persist
    try {
        var saved = await window.storage.saveConfig({ providers: config.providers });
        if (saved) {
            setSettingsStatus("服务商已创建，请点击卡片配置 API 信息", "success");
            hideProviderForm();
            renderProviderList();
        } else {
            setSettingsStatus("保存失败，请重试", "error");
        }
    } catch (e) {
        console.error("[Settings] Save provider failed:", e);
        setSettingsStatus("保存失败: " + e.message, "error");
    }
}

async function deleteProvider(providerId) {
    var providers = getProviders();
    var prov = providers.find(function (p) { return p.id === providerId; });
    if (!prov) return;

    if (!confirm("确定要删除服务商 \"" + prov.name + "\" 吗？关联的模型也将被删除。")) {
        return;
    }

    var config = window.__turingConfig;
    if (!config || !config.providers) return;

    // Check if selected model belongs to this provider
    var currentKey = window.state.get("selectedModel");
    var currentParsed = window.parseModelKey(currentKey, config.providers);
    var currentBelongs = currentParsed.providerId === providerId;

    config.providers = config.providers.filter(function (p) { return p.id !== providerId; });

    try {
        var saved = await window.storage.saveConfig({ providers: config.providers });
        if (saved) {
            // If deleted provider owned the selected model, fallback to first available
            if (currentBelongs) {
                var newFlat = window.deriveFlatModels(config.providers);
                var fallback = newFlat.length > 0
                    ? window.composeModelKey(newFlat[0].providerId, newFlat[0].id)
                    : window.CONFIG.selectedModel;
                window.state.set("selectedModel", fallback);
                console.log("[Settings] Deleted provider had selected model, switched to:", fallback);
            }
            // Refresh model list
            var updatedFlat = window.deriveFlatModels(config.providers);
            window.state.set("models", updatedFlat);
            setSettingsStatus("服务商已删除", "success");
            renderProviderList();
        } else {
            setSettingsStatus("删除失败", "error");
        }
    } catch (e) {
        console.error("[Settings] Delete provider failed:", e);
        setSettingsStatus("删除失败: " + e.message, "error");
    }
}

/* ============================================================
   Step 2: Provider Configuration Panel
   ============================================================ */

/**
 * Show the provider configuration panel (Step 2).
 * User configures API Key, API URL, and fetches/selects models.
 */
function showProviderConfigPanel(providerId) {
    var panel = document.getElementById("provider-config-panel");
    var title = document.getElementById("provider-config-title");
    var inputKey = document.getElementById("input-config-apikey");
    var inputUrl = document.getElementById("input-config-apiurl");
    var modelList = document.getElementById("model-checkbox-list");
    var fetchStatus = document.getElementById("fetch-models-status");

    var providers = getProviders();
    var prov = providers.find(function (p) { return p.id === providerId; });
    if (!prov) return;

    configuringProviderId = providerId;

    // Set title
    var typeInfo = window.PROVIDER_TYPE_INFO[prov.type] || {};
    var typeLabel = typeInfo.label || prov.type;
    if (title) title.textContent = "配置 " + prov.name + " (" + typeLabel + ")";

    // Fill current values
    if (inputKey) inputKey.value = prov.apiKey || "";
    if (inputUrl) {
        inputUrl.value = prov.apiUrl || (typeInfo.defaultApiUrl || "");
    }

    // Reset model list and fetch status
    if (modelList) {
        modelList.classList.add("hidden");
        modelList.innerHTML = "";
    }
    if (fetchStatus) fetchStatus.textContent = "";

    // Reset API key toggle to hidden state
    if (inputKey) inputKey.type = "password";
    var btnToggle = document.getElementById("btn-toggle-apikey");
    if (btnToggle) btnToggle.innerHTML = iconSpan('eye-off');

    clearSettingsStatus();

    // Show config panel, hide provider list
    var providerList = document.getElementById("provider-list");
    var btnAdd = document.getElementById("btn-add-provider");
    if (providerList) providerList.classList.add("hidden");
    if (btnAdd) btnAdd.classList.add("hidden");
    panel.classList.remove("hidden");
}

function hideProviderConfigPanel() {
    var panel = document.getElementById("provider-config-panel");
    if (panel) panel.classList.add("hidden");

    // Show provider list again
    var providerList = document.getElementById("provider-list");
    var btnAdd = document.getElementById("btn-add-provider");
    if (providerList) providerList.classList.remove("hidden");
    if (btnAdd) btnAdd.classList.remove("hidden");

    configuringProviderId = null;
    clearSettingsStatus();
}

function toggleApiKeyVisibility() {
    var input = document.getElementById("input-config-apikey");
    var btn = document.getElementById("btn-toggle-apikey");
    if (!input) return;
    if (input.type === "password") {
        input.type = "text";
        if (btn) btn.innerHTML = iconSpan('eye');
    } else {
        input.type = "password";
        if (btn) btn.innerHTML = iconSpan('eye-off');
    }
}

/**
 * Fetch available image models from the provider's API.
 */
async function handleFetchModels() {
    var inputKey = document.getElementById("input-config-apikey");
    var inputUrl = document.getElementById("input-config-apiurl");
    var fetchStatus = document.getElementById("fetch-models-status");
    var fetchBtn = document.getElementById("btn-fetch-models");

    var apiKey = inputKey ? inputKey.value.trim() : "";
    var apiUrl = inputUrl ? inputUrl.value.trim() : "";

    if (!apiKey) {
        setSettingsStatus("请先输入 API 密钥", "error");
        if (inputKey) inputKey.focus();
        return;
    }
    if (!apiUrl) {
        setSettingsStatus("请先输入 API 地址", "error");
        if (inputUrl) inputUrl.focus();
        return;
    }

    // Update UI to loading state
    if (fetchBtn) fetchBtn.classList.add("disabled");
    if (fetchStatus) {
        fetchStatus.textContent = "正在获取模型列表...";
        fetchStatus.className = "fetch-status";
    }

    var providers = getProviders();
    var prov = providers.find(function (p) { return p.id === configuringProviderId; });
    if (!prov) {
        setSettingsStatus("服务商信息丢失", "error");
        if (fetchBtn) fetchBtn.classList.remove("disabled");
        return;
    }

    try {
        var availableModels = [];
        if (prov.type === "openai") {
            availableModels = await fetchOpenAIImageModels(apiUrl, apiKey);
        } else if (prov.type === "gemini") {
            availableModels = await fetchGeminiImageModels(apiUrl, apiKey);
        } else {
            throw new Error("不支持的服务商类型: " + prov.type);
        }

        if (availableModels.length === 0) {
            if (fetchStatus) {
                fetchStatus.textContent = "未找到可用的图片生成模型";
                fetchStatus.className = "fetch-status error";
            }
            if (fetchBtn) fetchBtn.classList.remove("disabled");
            return;
        }

        // Render checkbox list with currently saved models pre-checked
        renderModelCheckboxList(availableModels, prov.models || []);

        if (fetchStatus) {
            fetchStatus.textContent = "找到 " + availableModels.length + " 个可用模型，请勾选需要调用的模型";
            fetchStatus.className = "fetch-status success";
        }
        setSettingsStatus("", "");
    } catch (e) {
        console.error("[Settings] Fetch models failed:", e);
        if (fetchStatus) {
            fetchStatus.textContent = "获取失败，请检查 API Key 和地址是否正确";
            fetchStatus.className = "fetch-status error";
        }
        setSettingsStatus("API 信息错误: " + e.message, "error");
    } finally {
        if (fetchBtn) fetchBtn.classList.remove("disabled");
    }
}

/**
 * Fetch image-capable models from OpenAI-compatible API.
 */
async function fetchOpenAIImageModels(apiUrl, apiKey) {
    // Normalize baseUrl
    var baseUrl = apiUrl;
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);

    var response = await fetch(baseUrl + "/v1/models", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + apiKey
        }
    });

    if (!response.ok) {
        var errorText = await response.text();
        throw new Error("HTTP " + response.status + ": " + errorText);
    }

    var result = await response.json();
    var models = result.data || [];

    // Filter for image-capable models
    var imageKeywords = ["image", "dall-e", "vision", "gpt-4o", "gpt-4", "gemini"];
    var excludeKeywords = ["audio", "tts", "whisper", "embedding", "moderation", "davinci", "babbage", "curie"];

    var imageModels = models.filter(function (m) {
        var id = (m.id || "").toLowerCase();
        var hasImage = imageKeywords.some(function (kw) { return id.indexOf(kw) >= 0; });
        var excluded = excludeKeywords.some(function (kw) { return id.indexOf(kw) >= 0; });
        return hasImage && !excluded;
    });

    return imageModels.map(function (m) {
        return { id: m.id, name: m.id };
    });
}

/**
 * Fetch image-capable models from Gemini API.
 */
async function fetchGeminiImageModels(apiUrl, apiKey) {
    // Normalize baseUrl
    var baseUrl = apiUrl;
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);

    var response = await fetch(baseUrl + "/v1beta/models?key=" + apiKey, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
        var errorText = await response.text();
        throw new Error("HTTP " + response.status + ": " + errorText);
    }

    var result = await response.json();
    var models = result.models || [];

    // Filter for image-capable models (supportedGenerationMethods includes generateContent)
    var imageModels = models.filter(function (m) {
        var name = (m.name || "").toLowerCase();
        var displayName = (m.displayName || "").toLowerCase();
        // Check for image-related keywords
        var hasImage = name.indexOf("image") >= 0 || displayName.indexOf("image") >= 0;
        var hasVision = name.indexOf("vision") >= 0;
        var hasFlash = name.indexOf("flash") >= 0;
        var canGenerate = true;
        if (m.supportedGenerationMethods && Array.isArray(m.supportedGenerationMethods)) {
            canGenerate = m.supportedGenerationMethods.indexOf("generateContent") >= 0;
        }
        return canGenerate && (hasImage || hasVision || hasFlash);
    });

    return imageModels.map(function (m) {
        // Extract short model ID from the full name (e.g., "models/gemini-2.5-flash-image" → "gemini-2.5-flash-image")
        var shortId = m.name || m.id || "";
        if (shortId.indexOf("models/") === 0) shortId = shortId.slice(7);
        return { id: shortId, name: m.displayName || shortId };
    });
}

/**
 * Render model checkbox list using Spectrum sp-checkbox.
 * Pre-check models that are already saved.
 */
function renderModelCheckboxList(availableModels, savedModels) {
    var list = document.getElementById("model-checkbox-list");
    if (!list) return;

    list.innerHTML = "";

    var savedIds = (savedModels || []).filter(function (m) { return m.enabled !== false; }).map(function (m) { return m.id; });

    availableModels.forEach(function (model) {
        var cb = document.createElement("sp-checkbox");
        cb.setAttribute("value", model.id);
        cb.setAttribute("data-model-name", model.name);
        var label = model.name && model.name !== model.id ? model.name + " · " + model.id : model.id;
        // Truncate long labels to prevent wrapping in UXP's limited layout
        var display = label.length > 42 ? label.slice(0, 39) + "..." : label;
        cb.textContent = display;
        cb.style.marginBottom = "10px";
        cb.style.lineHeight = "20px";
        cb.style.minHeight = "20px";
        cb.title = label;
        if (savedIds.indexOf(model.id) >= 0) {
            cb.setAttribute("checked", "");
        }
        list.appendChild(cb);
    });

    list.classList.remove("hidden");
}

/**
 * Save provider configuration (Step 2): apiKey + apiUrl + selected models.
 */
async function handleSaveProviderConfig() {
    var inputKey = document.getElementById("input-config-apikey");
    var inputUrl = document.getElementById("input-config-apiurl");

    var apiKey = inputKey ? inputKey.value.trim() : "";
    var apiUrl = inputUrl ? inputUrl.value.trim() : "";

    if (!apiKey) {
        setSettingsStatus("请输入 API 密钥", "error");
        if (inputKey) inputKey.focus();
        return;
    }
    if (!apiUrl) {
        setSettingsStatus("请输入 API 地址", "error");
        if (inputUrl) inputUrl.focus();
        return;
    }

    // Collect selected models from sp-checkbox list
    var selectedModels = [];
    var checkboxes = document.querySelectorAll("#model-checkbox-list sp-checkbox[checked]");
    checkboxes.forEach(function (cb) {
        selectedModels.push({
            id: cb.getAttribute("value"),
            name: cb.getAttribute("data-model-name") || cb.getAttribute("value"),
            enabled: true
        });
    });

    if (selectedModels.length === 0) {
        setSettingsStatus("请至少勾选一个模型", "error");
        return;
    }

    var config = window.__turingConfig;
    if (!config || !config.providers) {
        setSettingsStatus("配置未加载", "error");
        return;
    }

    // Update the specific provider
    var provIdx = config.providers.findIndex(function (p) { return p.id === configuringProviderId; });
    if (provIdx < 0) {
        setSettingsStatus("服务商信息丢失", "error");
        return;
    }

    config.providers[provIdx].apiKey = apiKey;
    config.providers[provIdx].apiUrl = apiUrl;
    config.providers[provIdx].models = selectedModels;

    // Persist
    try {
        var saved = await window.storage.saveConfig({ providers: config.providers });
        if (saved) {
            // Refresh derived flat model list
            var flatModels = window.deriveFlatModels(config.providers);
            window.state.set("models", flatModels);

            // Check if selected model is still available
            var currentKey = window.state.get("selectedModel");
            var currentParsed = window.parseModelKey(currentKey, config.providers);
            var stillExists = flatModels.some(function (m) {
                return m.providerId === currentParsed.providerId && m.id === currentParsed.modelId;
            });
            if (!stillExists && flatModels.length > 0) {
                var fallback = window.composeModelKey(flatModels[0].providerId, flatModels[0].id);
                window.state.set("selectedModel", fallback);
                console.log("[Settings] Selected model not in new list, switched to:", fallback);
            }

            setSettingsStatus("服务商配置已保存（" + selectedModels.length + " 个模型）", "success");
            hideProviderConfigPanel();
            renderProviderList();
        } else {
            setSettingsStatus("保存失败，请重试", "error");
        }
    } catch (e) {
        console.error("[Settings] Save provider config failed:", e);
        setSettingsStatus("保存失败: " + e.message, "error");
    }
}

// Expose globally for non-module script loading (UXP compatibility)
window.initSettings = initSettings;
