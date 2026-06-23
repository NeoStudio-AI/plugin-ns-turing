/* ============================================================
   NS Turing - Image Encoding / Decoding Utilities
   ============================================================ */

export function base64ToBlob(dataUrl) {
    const [header, data] = dataUrl.split(",");
    const mimeType = header.split(":")[1]?.split(";")[0] || "image/png";
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
}

export function dataUrlToRawBase64(dataUrl) {
    const parts = dataUrl.split(",");
    return parts.length > 1 ? parts[1] : dataUrl;
}

export function getMimeType(dataUrl) {
    const match = dataUrl.match(/^data:(image\/\w+);/);
    return match ? match[1] : "image/png";
}

export function validateImageSize(dataUrl, maxMB = 20) {
    const sizeBytes = (dataUrl.length * 3) / 4;
    const sizeMB = sizeBytes / (1024 * 1024);
    const valid = sizeMB <= maxMB;
    return {
        valid,
        sizeMB: Math.round(sizeMB * 100) / 100,
        message: valid ? "" : `图片大小 ${sizeMB.toFixed(1)}MB 超限 (最大 ${maxMB}MB)`
    };
}

export function resizeImage(dataUrl, maxWidth = 2048, maxHeight = 2048, quality = 0.92) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            if (width === img.width && height === img.height) {
                resolve(dataUrl);
                return;
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/png", quality));
        };
        img.onerror = () => reject(new Error("Failed to load image for resize"));
        img.src = dataUrl;
    });
}
