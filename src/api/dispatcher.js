/* ============================================================
   NS Turing - API Dispatcher
   Routes requests to the correct provider based on model key.
   ============================================================ */

import { OpenAIProvider } from "./openai.js";
import { GeminiProvider } from "./gemini.js";
import { parseModelKey } from "../config.js";

// Singleton provider instances (lazy)
var _openaiProvider = null;
var _geminiProvider = null;

function getProviderInstance(type) {
    switch (type) {
        case "openai":
            if (!_openaiProvider) _openaiProvider = new OpenAIProvider();
            return _openaiProvider;
        case "gemini":
            if (!_geminiProvider) _geminiProvider = new GeminiProvider();
            return _geminiProvider;
        default:
            throw new Error("未知的 API 供应商类型: " + type);
    }
}

/**
 * Main dispatch function.
 * @param {Object} params
 * @param {string} params.model - Composite key "providerId|modelId"
 * @param {string} params.prompt
 * @param {string[]} params.referenceImages
 * @param {Object} params.config - Full app config (providers array)
 */
export async function dispatch(params) {
    var modelKey = params.model;
    var prompt = params.prompt;
    var referenceImages = params.referenceImages || [];
    var activeConfig = params.config;
    var providers = activeConfig.providers || [];

    var parsed = parseModelKey(modelKey, providers);
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
        prompt,
        referenceImages,
        model: modelId,
        apiKey: providerConfig.apiKey,
        apiUrl: providerConfig.apiUrl,
        canvasWidth: params.canvasWidth,
        canvasHeight: params.canvasHeight
    });
}
