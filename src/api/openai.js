/* ============================================================
   NS Turing - OpenAI Image Provider
   Uses provider-specific apiKey + apiUrl from settings.
   ============================================================ */

import { ImageProvider } from "./provider.js";

export class OpenAIProvider extends ImageProvider {
    get name() { return "openai"; }

    getCapabilities() {
        return { supportsResolution: true, supportsMultipleRefs: true, maxRefImages: 14 };
    }

    async generateImage(params) {
        var apiKey = params.apiKey;
        var baseUrl = params.apiUrl;
        var model = params.model || "gpt-image-2";
        var prompt = params.prompt;
        var referenceImages = params.referenceImages || [];
        var canvasW = params.canvasWidth || 1024;
        var canvasH = params.canvasHeight || 1024;

        if (!apiKey) throw new Error("OpenAI API Key 未设置，请在设置中配置");
        if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);

        if (referenceImages.length > 0) {
            return this._generateWithRefs(prompt, referenceImages, apiKey, baseUrl, model, canvasW, canvasH);
        }
        return this._generateTextToImage(prompt, apiKey, baseUrl, model, canvasW, canvasH);
    }

    async _generateTextToImage(prompt, apiKey, baseUrl, model, canvasW, canvasH) {
        var size = this._pickCanvasSize(model, canvasW, canvasH);
        console.log("[OpenAI] TTI size: " + size + " (canvas: " + canvasW + "x" + canvasH + ", model: " + model + ")");

        var body = { model, prompt, n: 1, size, response_format: "b64_json" };
        var response = await fetch(baseUrl + "/v1/images/generations", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
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
                    images.push(await this._blobToDataUrl(blob));
                }
            }
        }
        return images;
    }

    _generateWithRefs(prompt, referenceImages, apiKey, baseUrl, model, canvasW, canvasH) {
        if (model && model.indexOf("gpt-image") >= 0) {
            return this._generateImageEdits(prompt, referenceImages, apiKey, baseUrl, model, canvasW, canvasH);
        }
        return this._generateChatCompletions(prompt, referenceImages, apiKey, baseUrl, model, canvasW, canvasH);
    }

    async _generateImageEdits(prompt, referenceImages, apiKey, baseUrl, model, canvasW, canvasH) {
        var maxImg = 4;
        if (referenceImages.length > maxImg) {
            console.warn("[OpenAI] Edits API supports max " + maxImg + " references, truncating from " + referenceImages.length);
        }
        var images = referenceImages.slice(0, maxImg);
        var size = this._pickCanvasSize(model, canvasW, canvasH);
        console.log("[OpenAI] ImageEdits: model=" + model + ", size=" + size + ", refs=" + images.length);

        var formData = new FormData();
        for (var i = 0; i < images.length; i++) {
            formData.append("image", this._dataUrlToBlob(images[i]), "ref_" + i + ".png");
        }
        formData.append("prompt", prompt);
        formData.append("model", model);
        formData.append("size", size);
        formData.append("n", "1");

        var response = await fetch(baseUrl + "/v1/images/edits", {
            method: "POST",
            headers: { "Authorization": "Bearer " + apiKey },
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
                    resultImages.push(await this._blobToDataUrl(urlBlob));
                }
            }
        }
        return resultImages;
    }

    async _generateChatCompletions(prompt, referenceImages, apiKey, baseUrl, model, canvasW, canvasH) {
        var sizeHint = this._makeSizeHint(canvasW, canvasH);
        var fullPrompt = prompt + "\n\n" + sizeHint;
        var content = [{ type: "text", text: fullPrompt }];
        for (var i = 0; i < referenceImages.length; i++) {
            content.push({ type: "image_url", image_url: { url: referenceImages[i], detail: "high" } });
        }

        var body = { model, messages: [{ role: "user", content }], max_tokens: 4096 };
        var response = await fetch(baseUrl + "/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
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
                            var mime = part.image.mime_type || "image/png";
                            images.push("data:" + mime + ";base64," + part.image.data);
                        }
                    }
                }
            }
        }
        return images;
    }

    _dataUrlToBlob(dataUrl) {
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
    }

    _pickCanvasSize(model, w, h) {
        if (!w || !h) return "1024x1024";
        var isGptImage = model && model.indexOf("gpt-image") >= 0;
        if (isGptImage) {
            var rw = Math.floor(w / 16) * 16;
            var rh = Math.floor(h / 16) * 16;
            var minSide = Math.min(rw, rh);
            if (minSide < 1024) {
                var scale = 1024 / minSide;
                rw = Math.floor(rw * scale / 16) * 16;
                rh = Math.floor(rh * scale / 16) * 16;
            }
            rw = Math.min(3840, rw);
            rh = Math.min(3840, rh);
            var MAX_PIXELS = 3840 * 2160;
            if (rw * rh > MAX_PIXELS) {
                var areaScale = Math.sqrt(MAX_PIXELS / (rw * rh));
                rw = Math.floor(rw * areaScale / 16) * 16;
                rh = Math.floor(rh * areaScale / 16) * 16;
            }
            console.log("[OpenAI] Canvas " + w + "x" + h + " → size " + rw + "x" + rh);
            return rw + "x" + rh;
        }
        var ratio = w / h;
        if (ratio > 1.3) return "1792x1024";
        if (ratio < 0.77) return "1024x1792";
        return "1024x1024";
    }

    _makeSizeHint(w, h) {
        if (!w || !h) return "";
        return "请生成一张" + w + "x" + h + "像素的图片，保持该精确尺寸。";
    }

    _blobToDataUrl(blob) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}
