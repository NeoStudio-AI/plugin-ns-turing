/* ============================================================
   NS Turing - Default Configuration (Provider-based)
   ============================================================ */

/** Provider type metadata for UI display & endpoint docs */
export const PROVIDER_TYPE_INFO = {
    openai: {
        label: "OpenAI",
        defaultApiUrl: "https://api.openai.com",
        endpoints: {
            textToImage: "POST /v1/images/generations",
            imageToImage: "POST /v1/images/edits"
        },
        docs: {
            textToImage: "https://api-gpt-ge.apifox.cn/288964677e0",
            imageToImage: "https://api-gpt-ge.apifox.cn/210463340e0"
        }
    },
    gemini: {
        label: "Google Gemini",
        defaultApiUrl: "https://generativelanguage.googleapis.com",
        endpoints: {
            textToImage: "POST /v1beta/models/{model}:generateContent",
            imageToImage: "POST /v1beta/models/{model}:generateContent"
        },
        docs: {
            textToImage: "https://api-gpt-ge.apifox.cn/345881374e0",
            imageToImage: "https://api-gpt-ge.apifox.cn/345967870e0"
        }
    }
};

export const CONFIG = {
    // API Providers (user-configured, Cherry Studio style)
    providers: [
        {
            id: "default-openai",
            name: "OpenAI",
            type: "openai",
            apiKey: "",
            apiUrl: "https://api.openai.com",
            models: [
                { id: "gpt-image-2", name: "GPT-image-2", enabled: true }
            ]
        },
        {
            id: "default-google",
            name: "Google Gemini",
            type: "gemini",
            apiKey: "",
            apiUrl: "https://generativelanguage.googleapis.com",
            models: [
                { id: "gemini-3-pro-image-preview", name: "Gemini 3 Pro Image", enabled: true },
                { id: "gemini-3.1-flash-image-preview", name: "Gemini 3.1 Flash Image", enabled: true }
            ]
        }
    ],

    selectedModel: "default-openai|gpt-image-2",

    maxReferenceImages: 10,
    maxImageSizeMB: 20,
    maxPromptWords: 110,
    imageQuality: 0.92,

    configFileName: "config.json"
};

/**
 * Derive a flat list of enabled models from providers.
 */
export function deriveFlatModels(providers) {
    var flat = [];
    if (!providers) return flat;
    providers.forEach(function (p) {
        var models = p.models || [];
        models.forEach(function (m) {
            if (m.enabled !== false) {
                flat.push({
                    id: m.id,
                    name: m.name,
                    providerId: p.id,
                    providerName: p.name,
                    providerType: p.type
                });
            }
        });
    });
    return flat;
}

/**
 * Migrate old config format to new format (models embedded in providers).
 */
export function migrateConfig(config) {
    if (!config || !config.providers) return config;

    if (config.selectedModel && config.selectedModel.indexOf("|") < 0) {
        var oldModelId = config.selectedModel;
        var found = false;
        if (config.providers) {
            for (var i = 0; i < config.providers.length && !found; i++) {
                var p = config.providers[i];
                var pmodels = p.models || [];
                for (var j = 0; j < pmodels.length && !found; j++) {
                    if (pmodels[j].id === oldModelId) {
                        config.selectedModel = p.id + "|" + oldModelId;
                        found = true;
                    }
                }
            }
        }
        if (!found && config.providers && config.providers.length > 0) {
            var fp = config.providers[0];
            var fmodels = fp.models || [];
            if (fmodels.length > 0) {
                config.selectedModel = fp.id + "|" + fmodels[0].id;
            }
        }
    }

    var needsMigration = config.providers.length > 0 && config.providers[0].models === undefined;
    if (needsMigration && config.models) {
        var oldModels = config.models || [];
        config.providers.forEach(function (p) {
            p.models = oldModels
                .filter(function (m) { return m.provider === p.type; })
                .map(function (m) { return { id: m.id, name: m.name, enabled: true }; });
        });
        delete config.models;
    }

    config.providers.forEach(function (p) {
        if (!p.models) p.models = [];
    });

    return config;
}

export function composeModelKey(providerId, modelId) {
    return providerId + "|" + modelId;
}

export function parseModelKey(key, providers) {
    if (!key) return { providerId: "", modelId: "" };
    var pipeIdx = key.indexOf("|");
    if (pipeIdx > 0) {
        return { providerId: key.slice(0, pipeIdx), modelId: key.slice(pipeIdx + 1) };
    }
    var modelId = key;
    if (providers) {
        for (var i = 0; i < providers.length; i++) {
            var models = providers[i].models || [];
            var found = models.find(function (m) { return m.id === modelId; });
            if (found) return { providerId: providers[i].id, modelId: modelId };
        }
    }
    return { providerId: "", modelId: modelId };
}
