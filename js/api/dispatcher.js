/* ============================================================
   NS Turing - API Dispatcher
   Routes requests to the correct provider based on model name.
   Uses per-provider apiKey + apiUrl from config.providers.
   ============================================================ */

// Singleton provider instances (lazy)
var _openaiProvider = null;
var _geminiProvider = null;

function getProviderInstance(type) {
    switch (type) {
        case "openai":
            if (!_openaiProvider) _openaiProvider = new window.OpenAIProvider();
            return _openaiProvider;
        case "gemini":
            if (!_geminiProvider) _geminiProvider = new window.GeminiProvider();
            return _geminiProvider;
        default:
            throw new Error("未知的 API 供应商类型: " + type);
    }
}

/**
 * Resolve providerId by model ID from the flat models list.
 * @param {string} modelId
 * @param {Array} flatModels - Derived flat model list with providerId
 * @returns {string} providerId
 */
function resolveProviderId(modelId, flatModels) {
    var match = flatModels.find(function (m) { return m.id === modelId; });
    if (match) return match.providerId;

    // Fallback: infer from model ID prefix (for models not in flat list)
    if (modelId.startsWith("gpt")) {
        // Find first openai provider
        var providers = (window.__turingConfig || window.CONFIG).providers || [];
        var openai = providers.find(function (p) { return p.type === "openai"; });
        if (openai) return openai.id;
    }
    if (modelId.startsWith("gemini")) {
        var providers = (window.__turingConfig || window.CONFIG).providers || [];
        var gemini = providers.find(function (p) { return p.type === "gemini"; });
        if (gemini) return gemini.id;
    }
    throw new Error("无法识别模型 \"" + modelId + "\" 的 API 供应商");
}

/**
 * Find a provider config by its exact providerId.
 * @param {string} providerId
 * @param {Array} providers - Provider array
 * @returns {Object|undefined}
 */
function findProviderConfigById(providerId, providers) {
    return providers.find(function (p) { return p.id === providerId; });
}

/**
 * Main dispatch function.
 * @param {Object} params
 * @param {string} params.model - Composite key "providerId|modelId" or plain modelId
 */
async function dispatch(params) {
    var modelKey = params.model;
    var prompt = params.prompt;
    var referenceImages = params.referenceImages || [];
    var activeConfig = window.__turingConfig || window.CONFIG;
    var providers = activeConfig.providers || [];

    // Parse composite key to extract providerId and modelId
    var parsed = window.parseModelKey(modelKey, providers);
    var providerId = parsed.providerId;
    var modelId = parsed.modelId;

    if (!providerId) {
        throw new Error("无法识别模型 \"" + modelKey + "\" 的 API 供应商");
    }

    var providerConfig = providers.find(function (p) { return p.id === providerId; });

    if (!providerConfig) {
        throw new Error("未找到 ID 为 \"" + providerId + "\" 的服务商配置，请在设置中添加");
    }

    if (!providerConfig.apiKey) {
        throw new Error("服务商 \"" + providerConfig.name + "\" 的 API Key 未设置，请在设置中配置");
    }

    var providerType = providerConfig.type;
    var provider = getProviderInstance(providerType);

    console.log("[Dispatcher] -> " + providerConfig.name + " (" + providerType + "), model=" + modelId + ", key=" + modelKey + ", refs=" + referenceImages.length + ", canvas=" + params.canvasWidth + "x" + params.canvasHeight);

    return await provider.generateImage({
        prompt: prompt,
        referenceImages: referenceImages,
        model: modelId,
        apiKey: providerConfig.apiKey,
        apiUrl: providerConfig.apiUrl,
        canvasWidth: params.canvasWidth,
        canvasHeight: params.canvasHeight
    });
}

// Expose globally for non-module script loading (UXP compatibility)
window.Turing_dispatch = dispatch;
