/* ============================================================
   NS Turing - OpenAI Image Provider
   Uses provider-specific apiKey + apiUrl from settings.
   ============================================================ */

var OpenAIProvider = (function () {
    function OpenAIProvider() {}
    OpenAIProvider.prototype = Object.create(window.ImageProvider.prototype);
    OpenAIProvider.prototype.constructor = OpenAIProvider;

    OpenAIProvider.prototype.name = "openai";

    OpenAIProvider.prototype.getCapabilities = function () {
        return {
            supportsResolution: true,
            supportsMultipleRefs: true,
            maxRefImages: 14
        };
    };

    /**
     * Generate image(s) using the OpenAI API.
     * @param {Object} params
     * @param {string} params.apiKey - Provider API key
     * @param {string} params.apiUrl - Provider base URL
     * @param {string} params.model - Model ID
     * @param {string} params.prompt - Text prompt
     * @param {string[]} params.referenceImages - Array of data URLs
     */
    OpenAIProvider.prototype.generateImage = async function (params) {
        var apiKey = params.apiKey;
        var baseUrl = params.apiUrl;
        var model = params.model || "gpt-image-2";
        var prompt = params.prompt;
        var referenceImages = params.referenceImages || [];
        var canvasW = params.canvasWidth || 1024;
        var canvasH = params.canvasHeight || 1024;

        if (!apiKey) {
            throw new Error("OpenAI API Key 未设置，请在设置中配置");
        }

        // Normalize baseUrl (strip trailing slash)
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.slice(0, -1);
        }

        if (referenceImages.length > 0) {
            return this._generateWithRefs(prompt, referenceImages, apiKey, baseUrl, model, canvasW, canvasH);
        }
        return this._generateTextToImage(prompt, apiKey, baseUrl, model, canvasW, canvasH);
    };

    /** Text-to-image via /v1/images/generations */
    OpenAIProvider.prototype._generateTextToImage = async function (prompt, apiKey, baseUrl, model, canvasW, canvasH) {
        var size = this._pickCanvasSize(model, canvasW, canvasH);
        console.log("[OpenAI] TTI size: " + size + " (canvas: " + canvasW + "x" + canvasH + ", model: " + model + ")");

        var body = {
            model: model,
            prompt: prompt,
            n: 1,
            size: size,
            response_format: "b64_json"
        };

        var response = await fetch(baseUrl + "/v1/images/generations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + apiKey
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            var error = await response.text();
            throw new Error("OpenAI API error (" + response.status + "): " + error);
        }

        var result = await response.json();
        var images = [];

        if (result.data) {
            for (var i = 0; i < result.data.length; i++) {
                var item = result.data[i];
                if (item.b64_json) {
                    images.push("data:image/png;base64," + item.b64_json);
                } else if (item.url) {
                    var urlResponse = await fetch(item.url);
                    var blob = await urlResponse.blob();
                    var dataUrl = await this._blobToDataUrl(blob);
                    images.push(dataUrl);
                }
            }
        }
        return images;
    };

    /**
     * Image-to-image: routes to the correct endpoint based on model type.
     * - gpt-image-* models → /v1/images/edits (multipart/form-data)
     * - Other models (GPT-4o, etc.) → /v1/chat/completions (JSON)
     */
    OpenAIProvider.prototype._generateWithRefs = async function (prompt, referenceImages, apiKey, baseUrl, model, canvasW, canvasH) {
        if (model && model.indexOf("gpt-image") >= 0) {
            return this._generateImageEdits(prompt, referenceImages, apiKey, baseUrl, model, canvasW, canvasH);
        }
        return this._generateChatCompletions(prompt, referenceImages, apiKey, baseUrl, model, canvasW, canvasH);
    };

    /**
     * Image-to-image via /v1/images/edits for gpt-image-* models.
     * Uses multipart/form-data as required by the API.
     * Reference: https://api-gpt-ge.apifox.cn/210463340e0
     */
    OpenAIProvider.prototype._generateImageEdits = async function (prompt, referenceImages, apiKey, baseUrl, model, canvasW, canvasH) {
        // API limit: max 4 reference images
        var maxImg = 4;
        if (referenceImages.length > maxImg) {
            console.warn("[OpenAI] Edits API supports max " + maxImg + " references, truncating from " + referenceImages.length);
        }
        var images = referenceImages.slice(0, maxImg);

        var size = this._pickCanvasSize(model, canvasW, canvasH);
        console.log("[OpenAI] ImageEdits: model=" + model + ", size=" + size + ", refs=" + images.length);

        // Build FormData (multipart/form-data)
        var formData = new FormData();

        // Append each image as a binary file
        for (var i = 0; i < images.length; i++) {
            var blob = this._dataUrlToBlob(images[i]);
            formData.append("image", blob, "ref_" + i + ".png");
        }

        formData.append("prompt", prompt);
        formData.append("model", model);
        formData.append("size", size);
        formData.append("n", "1");

        // Do NOT set Content-Type manually — fetch sets it with boundary for FormData
        var response = await fetch(baseUrl + "/v1/images/edits", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + apiKey
            },
            body: formData
        });

        if (!response.ok) {
            var error = await response.text();
            throw new Error("OpenAI API error (" + response.status + "): " + error);
        }

        var result = await response.json();
        var resultImages = [];

        if (result.data) {
            for (var j = 0; j < result.data.length; j++) {
                var item = result.data[j];
                if (item.b64_json) {
                    resultImages.push("data:image/png;base64," + item.b64_json);
                } else if (item.url) {
                    var urlResponse = await fetch(item.url);
                    var urlBlob = await urlResponse.blob();
                    var dataUrl = await this._blobToDataUrl(urlBlob);
                    resultImages.push(dataUrl);
                }
            }
        }
        return resultImages;
    };

    /** img2img via Chat Completions API (for non-gpt-image models like GPT-4o) */
    OpenAIProvider.prototype._generateChatCompletions = async function (prompt, referenceImages, apiKey, baseUrl, model, canvasW, canvasH) {
        // Append canvas size instruction to prompt
        var sizeHint = this._makeSizeHint(canvasW, canvasH);
        var fullPrompt = prompt + "\n\n" + sizeHint;

        // Build multimodal content array
        var content = [{ type: "text", text: fullPrompt }];

        for (var i = 0; i < referenceImages.length; i++) {
            content.push({
                type: "image_url",
                image_url: { url: referenceImages[i], detail: "high" }
            });
        }

        var body = {
            model: model,
            messages: [{ role: "user", content: content }],
            max_tokens: 4096
        };

        var response = await fetch(baseUrl + "/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + apiKey
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            var error = await response.text();
            throw new Error("OpenAI API error (" + response.status + "): " + error);
        }

        var result = await response.json();
        var images = [];

        if (result.choices) {
            for (var i = 0; i < result.choices.length; i++) {
                var msg = result.choices[i].message;
                if (msg && msg.content) {
                    var parts = Array.isArray(msg.content) ? msg.content : [msg.content];
                    for (var j = 0; j < parts.length; j++) {
                        var part = parts[j];
                        if (part.type === "image_url" && part.image_url) {
                            images.push(part.image_url.url);
                        } else if (part.type === "image" && part.image) {
                            var imgData = part.image;
                            var mime = imgData.mime_type || "image/png";
                            images.push("data:" + mime + ";base64," + imgData.data);
                        }
                    }
                }
            }
        }
        return images;
    };

    /**
     * Convert a base64 data URL to a Blob for FormData upload.
     * @param {string} dataUrl - "data:image/png;base64,..."
     * @returns {Blob}
     */
    OpenAIProvider.prototype._dataUrlToBlob = function (dataUrl) {
        var parts = dataUrl.split(",");
        var mimeMatch = parts[0].match(/:(.*?);/);
        var mime = mimeMatch ? mimeMatch[1] : "image/png";
        var b64 = parts[1];
        var byteChars = atob(b64);
        var byteNumbers = new Uint8Array(byteChars.length);
        for (var i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
        }
        return new Blob([byteNumbers], { type: mime });
    };

    /**
     * Map canvas dimensions to the size parameter sent to the API.
     * For gpt-image-2/1.5/1: returns actual canvas size rounded to multiple-of-16,
     * clamped to 3840px per side (API capability).
     * For legacy models (dall-e): returns closest fixed size.
     * @param {string} model - Model ID
     * @param {number} w - Canvas width in px
     * @param {number} h - Canvas height in px
     * @returns {string} "WxH" size string
     */
    OpenAIProvider.prototype._pickCanvasSize = function (model, w, h) {
        if (!w || !h) return "1024x1024";

        // gpt-image-2 supports 1024-3840px per side, each must be multiple of 16.
        // Minimum pixel budget requires the shorter side >= 1024.
        // If the canvas is smaller, scale proportionally to preserve aspect ratio.
        var isGptImage = model && model.indexOf("gpt-image") >= 0;
        if (isGptImage) {
            // Floor to nearest multiple of 16
            var rw = Math.floor(w / 16) * 16;
            var rh = Math.floor(h / 16) * 16;
            // Ensure shorter side meets 1024 minimum, scaling proportionally
            var minSide = Math.min(rw, rh);
            if (minSide < 1024) {
                var scale = 1024 / minSide;
                rw = Math.floor(rw * scale / 16) * 16;
                rh = Math.floor(rh * scale / 16) * 16;
            }
            // Cap each side at 3840
            rw = Math.min(3840, rw);
            rh = Math.min(3840, rh);
            // Cap total pixel budget (gpt-image-2 upper limit ~8.3M pixels)
            var MAX_PIXELS = 3840 * 2160; // 8,294,400
            if (rw * rh > MAX_PIXELS) {
                var areaScale = Math.sqrt(MAX_PIXELS / (rw * rh));
                rw = Math.floor(rw * areaScale / 16) * 16;
                rh = Math.floor(rh * areaScale / 16) * 16;
            }
            console.log("[OpenAI] Canvas " + w + "x" + h + " → size " + rw + "x" + rh + " (gpt-image, 16x floor, range 1024-8.3Mpx)");
            return rw + "x" + rh;
        }

        // Legacy fixed-size mapping for dall-e and unknown models
        var ratio = w / h;
        if (ratio > 1.3) return "1792x1024";        // landscape
        if (ratio < 0.77) return "1024x1792";       // portrait
        return "1024x1024";                          // square / near-square
    };

    /**
     * Build a prompt hint about desired output dimensions.
     * For img2img via Chat Completions, the exact size cannot be set programmatically,
     * so we instruct the model via the prompt.
     */
    OpenAIProvider.prototype._makeSizeHint = function (w, h) {
        if (!w || !h) return "";
        return "请生成一张" + w + "x" + h + "像素的图片，保持该精确尺寸。";
    };

    OpenAIProvider.prototype._blobToDataUrl = function (blob) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    return OpenAIProvider;
})();

// Expose globally for non-module script loading (UXP compatibility)
window.OpenAIProvider = OpenAIProvider;
