/* ============================================================
   NS Turing - Photoshop API Interactions (ES Module)
   ============================================================ */

/**
 * Get Photoshop modules (photoshop, uxp).
 * Returns nulls if not in Photoshop UXP environment.
 */
function getPSModules() {
    try {
        if (typeof require !== "function") return { app: null, core: null, action: null, fs: null };
        const photoshop = require("photoshop");
        const uxp = require("uxp");
        return {
            app: photoshop.app,
            core: photoshop.core,
            action: photoshop.action,
            batchPlay: photoshop.action.batchPlay,
            fs: uxp.storage.localFileSystem,
            fileTypes: uxp.storage.fileTypes,
            formats: uxp.storage.formats
        };
    } catch (e) {
        console.error("[Photoshop] Failed to load PS modules:", e);
        return { app: null, core: null, action: null, fs: null };
    }
}

/**
 * Get the active Photoshop document, or null.
 */
export function getActiveDocument() {
    try {
        const { app } = getPSModules();
        return app ? app.activeDocument : null;
    } catch (e) {
        return null;
    }
}


/**
 * Fix UTF-8 → Latin-1 mojibake in layer names that Photoshop
 * sometimes returns from the DOM API.
 */
function fixLayerName(name) {
    if (!name || typeof name !== "string") return "";
    // If already contains multi-byte chars (CJK, emoji, etc.), it's fine
    var hasMultiByte = false;
    for (var i = 0; i < name.length; i++) {
        if (name.charCodeAt(i) > 255) { hasMultiByte = true; break; }
    }
    if (hasMultiByte) return name;
    // All chars in Latin-1 range — try to decode as UTF-8
    try {
        var bytes = new Uint8Array(name.length);
        for (var j = 0; j < name.length; j++) {
            bytes[j] = name.charCodeAt(j) & 0xFF;
        }
        var decoded = new TextDecoder("utf-8").decode(bytes);
        // Only accept if it actually produced CJK characters
        if (/[\u4e00-\u9fff]/.test(decoded)) return decoded;
    } catch (_) { /* ignore */ }
    return name;
}

/**
 * List all pixel/raster layers in the active document.
 * Recursively traverses layer groups.
 */
export async function listLayers() {
    const doc = getActiveDocument();
    if (!doc) return [];

    const layers = [];

    function traverse(layerList, depth) {
        if (!depth) depth = 0;
        for (var i = 0; i < layerList.length; i++) {
            var layer = layerList[i];
            var kind = layer.kind || "unknown";
            if (kind === "pixel" || kind === "smartObject" || kind === "normal") {
                layers.push({
                    id: layer.id,
                    name: fixLayerName(layer.name),
                    kind: kind,
                    visible: layer.visible !== false,
                    depth: depth,
                    opacity: layer.opacity
                });
            }
            if (layer.layers && layer.layers.length > 0) {
                traverse(layer.layers, depth + 1);
            }
        }
    }

    try {
        traverse(doc.layers);
    } catch (e) {
        console.error("[Photoshop] listLayers error:", e);
    }
    return layers;
}

/**
 * Convert a UXP File entry to a base64 data URL.
 */
export async function uxpFileToDataUrl(file) {
    if (!file || !file.name) throw new Error("Invalid UXP file entry");

    const { formats } = getPSModules();

    var rawData = null;
    try {
        rawData = await file.read({ format: formats.binary });
    } catch (e) {
        rawData = await file.read();
    }

    if (!rawData || rawData.byteLength === 0) throw new Error("Empty or unreadable file");

    var bytes;
    if (rawData.buffer && typeof rawData.buffer.byteLength === "number") {
        bytes = rawData;
    } else {
        try { bytes = new Uint8Array(rawData); } catch (e) { bytes = null; }
    }

    if (!bytes || bytes.length === 0 || typeof bytes[0] === "undefined") {
        var reconstructLen = rawData.byteLength || rawData.length || 0;
        bytes = new Uint8Array(reconstructLen);
        for (var bi = 0; bi < reconstructLen; bi++) {
            bytes[bi] = rawData[bi] || 0;
        }
    }

    var base64 = "";
    var CHUNK_SIZE = 8190;
    for (var i = 0; i < bytes.length; i += CHUNK_SIZE) {
        var chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
        var binary = "";
        for (var j = 0; j < chunk.length; j++) {
            binary += String.fromCharCode(chunk[j]);
        }
        base64 += btoa(binary);
    }

    var ext = file.name.split(".").pop().toLowerCase();
    var mimeMap = {
        png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
        gif: "image/gif", webp: "image/webp", bmp: "image/bmp",
        tiff: "image/tiff", tif: "image/tiff"
    };
    var mime = mimeMap[ext] || "image/png";
    return "data:" + mime + ";base64," + base64;
}

/**
 * Open UXP native file picker for images.
 */
export async function pickImageFiles(allowMultiple) {
    try {
        const { fs, fileTypes } = getPSModules();
        if (!fs || !fileTypes) return null;
        const files = await fs.getFileForOpening({
            allowMultiple: !!allowMultiple,
            types: fileTypes.images
        });
        return files && files.length > 0 ? files : null;
    } catch (e) {
        console.error("[Photoshop] File picker failed:", e);
        return null;
    }
}

/**
 * Get document info: width, height, color mode.
 */
export function getDocumentInfo() {
    const doc = getActiveDocument();
    if (!doc) return null;
    return {
        width: doc.width,
        height: doc.height,
        resolution: doc.resolution,
        mode: doc.mode,
        name: doc.name
    };
}

/**
 * Convert binary data (Uint8Array or ArrayBuffer) to base64 data URL.
 */
function binaryToDataUrl(bytes, mimeType) {
    mimeType = mimeType || "image/png";
    var base64 = "";
    var CHUNK_SIZE = 8190;
    for (var i = 0; i < bytes.length; i += CHUNK_SIZE) {
        var chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
        var binary = "";
        for (var j = 0; j < chunk.length; j++) {
            binary += String.fromCharCode(chunk[j]);
        }
        base64 += btoa(binary);
    }
    return "data:" + mimeType + ";base64," + base64;
}

/**
 * Read a file with retry polling (PS writes asynchronously).
 */
async function readFileWithRetry(fs, fileEntry, nativePath, label) {
    var readFile = fileEntry;
    var rawData = null;
    var MAX_RETRIES = 20;
    var formats;
    try { formats = require("uxp").storage.formats; } catch (e) { /* ignore */ }

    for (var retry = 0; retry < MAX_RETRIES; retry++) {
        await new Promise(function (r) { setTimeout(r, 200); });

        if (!readFile && nativePath) {
            try { readFile = await fs.getEntryWithUrl("file:" + nativePath); } catch (e) { /* ignore */ }
        }
        if (!readFile) continue;

        try {
            rawData = formats ? await readFile.read({ format: formats.binary }) : await readFile.read();
        } catch (e) {
            rawData = await readFile.read();
        }
        if (rawData && rawData.byteLength > 0) {
            console.log("[Photoshop] " + label + ": " + rawData.byteLength + " bytes (retry " + (retry + 1) + ")");
            break;
        }
        console.log("[Photoshop] " + label + " retry " + (retry + 1) + "/" + MAX_RETRIES + ": waiting...");
    }
    return rawData;
}

/**
 * Validate PNG signature in raw bytes.
 */
function validatePng(bytes) {
    var pngSig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    if (bytes.length < 8) return false;
    for (var s = 0; s < 8; s++) {
        if (bytes[s] !== pngSig[s]) return false;
    }
    return true;
}

/**
 * Convert raw read data to a proper Uint8Array.
 */
function toValidBytes(rawData) {
    var bytes;
    if (rawData.buffer && typeof rawData.buffer.byteLength === "number") {
        bytes = rawData;
    } else {
        try { bytes = new Uint8Array(rawData); } catch (e) { bytes = null; }
    }
    if (!bytes || bytes.length === 0 || typeof bytes[0] === "undefined") {
        var recLen = rawData.byteLength || rawData.length || 0;
        bytes = new Uint8Array(recLen);
        for (var bi = 0; bi < recLen; bi++) { bytes[bi] = rawData[bi] || 0; }
    }
    return bytes;
}

/**
 * Export the entire canvas as a PNG base64 data URL.
 * Uses saveAs.png() inside executeAsModal + retry polling.
 */
export async function captureCanvasAsBase64() {
    const { core, fs } = getPSModules();
    const doc = getActiveDocument();
    if (!doc || !core || !fs) return null;

    var tempFile = null;
    try {
        const tempFolder = await fs.getTemporaryFolder();
        const timestamp = Date.now();
        tempFile = await tempFolder.createFile("turing_canvas_" + timestamp + ".png", { overwrite: true });
        console.log("[Photoshop] Canvas temp: " + tempFile.nativePath);

        await core.executeAsModal(async function () {
            const ps = require("photoshop");
            await ps.app.activeDocument.saveAs.png(tempFile, null, true);
            console.log("[Photoshop] Canvas saveAs.png() done");
        }, { commandName: "Export Canvas as PNG" });

        var nativePath = tempFile.nativePath.replace(/\\/g, "/");
        var rawData = await readFileWithRetry(fs, tempFile, nativePath, "Canvas read");
        if (!rawData || rawData.byteLength === 0) {
            console.warn("[Photoshop] Canvas export empty after retries");
            return null;
        }

        var bytes = toValidBytes(rawData);
        if (!validatePng(bytes)) {
            console.error("[Photoshop] Canvas export invalid PNG, bytes length=" + bytes.length);
            return null;
        }

        return binaryToDataUrl(bytes, "image/png");
    } catch (e) {
        console.error("[Photoshop] Canvas export failed:", e.message || e);
        return null;
    } finally {
        if (tempFile) { try { await tempFile.delete(); } catch (e) { /* ignore */ } }
    }
}

/**
 * Export a single layer by its ID as a PNG base64 data URL.
 *
 * THREE separate executeAsModal calls (avoiding PS event queue corruption):
 *   Modal 1 – open tiny PNG + resize + duplicate target layer into container
 *   Modal 2 – saveAs.png (export only, no lifecycle changes)
 *   Modal 3 – close container doc (cleanup only)
 */
export async function exportLayerAsBase64(layerId) {
    const { batchPlay, core, fs } = getPSModules();
    const doc = getActiveDocument();
    if (!doc || !batchPlay || !core || !fs) return null;

    var exportFile = null;
    var containerFile = null;
    var containerDocId = null;

    try {
        const tempFolder = await fs.getTemporaryFolder();
        const timestamp = Date.now();

        exportFile = await tempFolder.createFile("turing_layer_" + layerId + "_" + timestamp + ".png", { overwrite: true });

        // Create 1x1 transparent PNG as container
        const MINI_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ" +
            "AAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
        containerFile = await tempFolder.createFile("turing_container_" + timestamp + ".png", { overwrite: true });
        var binaryStr = atob(MINI_PNG_B64);
        var miniLen = binaryStr.length;
        var miniBytes = new Uint8Array(miniLen);
        for (var mi = 0; mi < miniLen; mi++) { miniBytes[mi] = binaryStr.charCodeAt(mi) & 0xFF; }
        await containerFile.write(miniBytes.buffer.slice(0, miniLen), { append: false });

        var origWidth = doc.width;
        var origHeight = doc.height;
        console.log("[Photoshop] Layer export: doc " + origWidth + "x" + origHeight);

        // === Modal 1: Open container + resize + duplicate target layer ===
        await core.executeAsModal(async function () {
            const ps = require("photoshop");
            var orig = ps.app.activeDocument;

            var token = await fs.createSessionToken(containerFile);
            await batchPlay([{
                _obj: "open", null: { _path: token, _kind: "local" },
                _options: { dialogOptions: "dontDisplay" }
            }], { synchronousExecution: true });

            var container = ps.app.activeDocument;
            containerDocId = container.id;

            // Resize container to match original doc dimensions
            try {
                await batchPlay([{
                    _obj: "imageSize",
                    _target: { _ref: "document", _enum: "ordinal", _value: "targetEnum" },
                    width: { _unit: "pixelsUnit", _value: origWidth },
                    height: { _unit: "pixelsUnit", _value: origHeight },
                    constrainProportions: false,
                    _options: { dialogOptions: "dontDisplay" }
                }], { synchronousExecution: true });
            } catch (resizeErr) {
                console.warn("[Photoshop] Container resize failed: " + (resizeErr.message || resizeErr));
            }

            // Switch back to original, select layer, duplicate to container
            ps.app.activeDocument = orig;
            await batchPlay([{
                _obj: "select", _target: { _ref: "layer", _id: layerId },
                makeVisible: true, _options: { dialogOptions: "dontDisplay" }
            }], { synchronousExecution: true });

            await batchPlay([{
                _obj: "duplicate",
                _target: { _ref: "layer", _enum: "ordinal", _value: "targetEnum" },
                to: { _ref: "document", _id: containerDocId },
                _options: { dialogOptions: "dontDisplay" }
            }], { synchronousExecution: true });

            ps.app.activeDocument = container;
            console.log("[Photoshop] Layer duplicated to container " + containerDocId);
        }, { commandName: "Create Container for Layer " + layerId });

        if (!containerDocId) { console.warn("[Photoshop] Container not created"); return null; }

        // === Modal 2: Export ONLY (saveAs.png) ===
        await core.executeAsModal(async function () {
            const ps = require("photoshop");
            await ps.app.activeDocument.saveAs.png(exportFile, null, true);
        }, { commandName: "Export Layer " + layerId + " as PNG" });

        // === Modal 3: Close container ONLY ===
        await core.executeAsModal(async function () {
            await batchPlay([{
                _obj: "close",
                _target: { _ref: "document", _id: containerDocId },
                saving: { _enum: "yesNo", _value: "no" },
                _options: { dialogOptions: "dontDisplay" }
            }], { synchronousExecution: true });
            containerDocId = null;
        }, { commandName: "Close Container" });

        var nativePath = exportFile.nativePath.replace(/\\/g, "/");
        var rawData = await readFileWithRetry(fs, exportFile, nativePath, "Layer read");
        if (!rawData || rawData.byteLength === 0) {
            console.warn("[Photoshop] Layer export empty after retries");
            return null;
        }

        var bytes = toValidBytes(rawData);
        if (!validatePng(bytes)) {
            console.error("[Photoshop] Layer export invalid PNG");
            return null;
        }

        return binaryToDataUrl(bytes, "image/png");
    } catch (e) {
        console.error("[Photoshop] Layer export failed:", e.message || e);
        return null;
    } finally {
        if (exportFile) { try { await exportFile.delete(); } catch (e) { /* ignore */ } }
        if (containerFile) { try { await containerFile.delete(); } catch (e) { /* ignore */ } }
    }
}

/**
 * Place generated images as Smart Objects in the active document.
 * Uses open+duplicate+newPlacedLayer pattern for UXP reliability.
 *
 * @param {string[]} base64Array - Array of "data:image/png;base64,..." strings
 * @returns {Promise<number>} Number of successfully placed images
 */
export async function addImagesAsSmartObjects(base64Array) {
    var modules = getPSModules();
    var batchPlay = modules.batchPlay;
    var core = modules.core;
    var fs = modules.fs;
    var doc = getActiveDocument();
    if (!doc || !batchPlay || !core || !fs || !base64Array.length) return 0;

    var placedCount = 0;
    var tempFiles = [];
    var targetDocId = doc.id;
    var targetDocW = doc.width;
    var targetDocH = doc.height;

    try {
        var tempFolder = await fs.getTemporaryFolder();
        var timestamp = Date.now();

        for (var i = 0; i < base64Array.length; i++) {
            var base64Str = base64Array[i];
            if (!base64Str) continue;

            var tempFile = null;
            try {
                var parts = base64Str.split(",");
                var header = parts[0];
                var data = parts[1];
                if (!data) continue;

                var ext = (header && header.indexOf("image/jpeg") >= 0) ? "jpg" : "png";
                var fileName = "turing_gen_" + timestamp + "_" + i + "." + ext;
                tempFile = await tempFolder.createFile(fileName, { overwrite: true });
                tempFiles.push(tempFile);

                var binaryStr = atob(data);
                var len = binaryStr.length;
                var bytes = new Uint8Array(len);
                for (var j = 0; j < len; j++) { bytes[j] = binaryStr.charCodeAt(j) & 0xFF; }
                await tempFile.write(bytes.buffer.slice(0, len), { append: false });

                var token = await fs.createSessionToken(tempFile);

                await core.executeAsModal(async function () {
                    var innerBP = require("photoshop").action.batchPlay;
                    var app = require("photoshop").app;

                    // Open temp PNG
                    await innerBP([{
                        _obj: "open", null: { _path: token, _kind: "local" },
                        _options: { dialogOptions: "dontDisplay" }
                    }], { synchronousExecution: true });

                    var tempDoc = app.activeDocument;
                    var tempW = tempDoc.width;
                    var tempH = tempDoc.height;
                    var fitScale = Math.min(targetDocW / tempW, targetDocH / tempH);

                    // Resize to fit within canvas
                    if (Math.abs(fitScale - 1.0) >= 0.001) {
                        var newW = Math.round(tempW * fitScale);
                        var newH = Math.round(tempH * fitScale);
                        try {
                            await innerBP([{
                                _obj: "imageSize",
                                _target: { _ref: "document", _enum: "ordinal", _value: "targetEnum" },
                                width: { _unit: "pixelsUnit", _value: newW },
                                constrainProportions: true,
                                _options: { dialogOptions: "dontDisplay" }
                            }], { synchronousExecution: true });
                        } catch (resizeErr) {
                            console.warn("[Photoshop] Place resize failed: " + (resizeErr.message || resizeErr));
                        }
                    }

                    // Duplicate to target document
                    await innerBP([{
                        _obj: "duplicate",
                        _target: { _ref: "layer", _enum: "ordinal", _value: "targetEnum" },
                        to: { _ref: "document", _id: targetDocId },
                        _options: { dialogOptions: "dontDisplay" }
                    }], { synchronousExecution: true });

                    // Close temp doc
                    await innerBP([{
                        _obj: "close",
                        _target: { _ref: "document", _enum: "ordinal", _value: "targetEnum" },
                        saving: { _enum: "yesNo", _value: "no" },
                        _options: { dialogOptions: "dontDisplay" }
                    }], { synchronousExecution: true });

                    // Convert to Smart Object
                    await innerBP([{ _obj: "newPlacedLayer" }], { synchronousExecution: true });

                    // Rename
                    var ln = "Turing-" + timestamp + "-" + (i + 1);
                    await innerBP([{
                        _obj: "set",
                        _target: { _ref: "layer", _enum: "ordinal", _value: "targetEnum" },
                        to: { _obj: "layer", name: ln },
                        _options: { dialogOptions: "dontDisplay" }
                    }], { synchronousExecution: true });

                    console.log("[Photoshop] Placed: " + ln);
                }, { commandName: "Place Turing Image " + (i + 1) });

                placedCount++;
            } catch (placeErr) {
                console.error("[Photoshop] Failed to place image " + i + ":", placeErr.message || placeErr);
            }
        }
    } catch (e) {
        console.error("[Photoshop] addImagesAsSmartObjects error:", e.message || e);
    } finally {
        for (var k = 0; k < tempFiles.length; k++) {
            try { await tempFiles[k].delete(); } catch (e) { /* ignore */ }
        }
    }
    return placedCount;
}
