/* ============================================================
   NS Turing - Model Fetch Utilities
   Used by Settings page to discover available models from APIs.
   ============================================================ */

/**
 * Fetch image-capable models from OpenAI-compatible API.
 * @param {string} apiUrl
 * @param {string} apiKey
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function fetchOpenAIImageModels(apiUrl, apiKey) {
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
 * @param {string} apiUrl
 * @param {string} apiKey
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function fetchGeminiImageModels(apiUrl, apiKey) {
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

    var imageModels = models.filter(function (m) {
        var name = (m.name || "").toLowerCase();
        var displayName = (m.displayName || "").toLowerCase();
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
        var shortId = m.name || m.id || "";
        if (shortId.indexOf("models/") === 0) shortId = shortId.slice(7);
        return { id: shortId, name: m.displayName || shortId };
    });
}
