/* ============================================================
   NS Turing - Photoshop API Interactions
   All operations that interact with the Photoshop document.
   Uses batchPlay (Action Manager) for complex operations.
   ============================================================ */

/**
 * Helper: Get Photoshop app and core modules safely.
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
            fs: uxp.storage.localFileSystem
        };
    } catch (e) {
        console.error("[Photoshop] Failed to load PS modules:", e);
        return { app: null, core: null, action: null, fs: null };
    }
}

const ps = {
    /**
     * Returns the active Photoshop document, or null.
     */
    getActiveDocument() {
        try {
            const { app } = getPSModules();
            return app ? app.activeDocument : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Get basic document info: width, height, color mode.
     */
    getDocumentInfo() {
        const doc = this.getActiveDocument();
        if (!doc) return null;
        return {
            width: doc.width,
            height: doc.height,
            resolution: doc.resolution,
            mode: doc.mode,
            name: doc.name
        };
    },

    /**
     * Export the entire canvas/active document as a PNG,
     * then read and return as a base64 data URL string.
     *
     * @returns {Promise<string|null>} "data:image/png;base64,..." or null on failure
     */
    async captureCanvasAsBase64() {
        const { core, fs } = getPSModules();
        const doc = this.getActiveDocument();
        if (!doc || !core || !fs) return null;

        var tempFile = null;
        try {
            // Create temp file OUTSIDE modal (no PS state change).
            // DO NOT pre-write empty data — let saveAs.png() handle file creation.
            const tempFolder = await fs.getTemporaryFolder();
            const timestamp = Date.now();
            tempFile = await tempFolder.createFile(`turing_canvas_${timestamp}.png`, { overwrite: true });
            console.log("[Photoshop] Temp file: " + tempFile.nativePath);

            // Use the documented DOM API saveAs.png() inside executeAsModal.
            // saveAs.png() MUST be in a modal scope (throws "saveDocumentSelection" error otherwise).
            await core.executeAsModal(async function () {
                const ps = require("photoshop");
                await ps.app.activeDocument.saveAs.png(tempFile, null, true);
                console.log("[Photoshop] saveAs.png() completed");
            }, { commandName: "Export Canvas as PNG" });

            if (!tempFile) {
                console.warn("[Photoshop] Failed to create temp file");
                return null;
            }

            // After saveAs.png() wrote the file, get a FRESH reference.
            // The original tempFile handle was created before the file
            // physically existed; it may be stale (Uint8Array yields undefined).
            var nativePath = tempFile.nativePath.replace(/\\/g, '/');
            var freshFile;
            try {
                freshFile = await fs.getEntryWithUrl("file:" + nativePath);
                console.log("[Photoshop] Got fresh file entry: " + (freshFile ? freshFile.name : "null"));
            } catch (e) {
                // getEntryWithUrl may fail on first try; the file might still
                // be flushing. Fall through to read from tempFile as backup.
                console.log("[Photoshop] getEntryWithUrl failed, falling back: " + e.message);
            }

            // CRITICAL: Photoshop writes files asynchronously.
            // Poll with retries to wait for the write to complete.
            var readFile = freshFile || tempFile;
            var rawData = null;  // UXP read() returns Uint8Array (NOT ArrayBuffer)
            var MAX_RETRIES = 20;
            for (var retry = 0; retry < MAX_RETRIES; retry++) {
                await new Promise(function (r) { setTimeout(r, 200); });

                // Retry getEntryWithUrl on each iteration if it failed initially
                if (!readFile) {
                    try {
                        readFile = await fs.getEntryWithUrl("file:" + nativePath);
                        console.log("[Photoshop] Retry got fresh file entry: " + readFile.name);
                    } catch (e) {
                        // still not available
                    }
                }
                if (!readFile) continue;

                // Use explicit binary format to ensure proper ArrayBuffer/Uint8Array
                try {
                    rawData = await readFile.read({ format: require("uxp").storage.formats.binary });
                } catch (e) {
                    rawData = await readFile.read(); // fallback to default
                }
                if (rawData && rawData.byteLength > 0) {
                    console.log("[Photoshop] Canvas exported: " + rawData.byteLength +
                        " bytes (retry " + (retry + 1) + ")");
                    break;
                }
                console.log("[Photoshop] Retry " + (retry + 1) + "/" + MAX_RETRIES + ": file still empty, waiting...");
            }

            if (!rawData || rawData.byteLength === 0) {
                console.warn("[Photoshop] Canvas export produced empty file after " + MAX_RETRIES + " retries");
                return null;
            }

            // UXP File.read() returns Uint8Array (NOT bare ArrayBuffer).
            // CRITICAL: Do NOT use DataView — its constructor uses instanceof
            // internally, which is broken in the UXP sandbox!
            // Instead, access bytes directly on the Uint8Array via [index].
            var bytes; // will be a Uint8Array we can index into
            if (rawData.buffer && typeof rawData.buffer.byteLength === "number") {
                // It's already a typed array (Uint8Array). Use it directly.
                bytes = rawData;
            } else {
                // Try to create a Uint8Array view.
                // If this fails, we'll reconstruct byte-by-byte below.
                try {
                    bytes = new Uint8Array(rawData);
                } catch (e) {
                    bytes = null;
                }
            }

            // If bytes is null or first byte is undefined, reconstruct manually
            if (!bytes || bytes.length === 0 || typeof bytes[0] === "undefined") {
                console.warn("[Photoshop] Uint8Array invalid, reconstructing from raw data (len=" +
                    (rawData.byteLength || rawData.length) + ")");
                var reconstructLen = rawData.byteLength || rawData.length || 0;
                bytes = new Uint8Array(reconstructLen);
                for (var bi = 0; bi < reconstructLen; bi++) {
                    bytes[bi] = rawData[bi] || 0;
                }
            }

            // Validate PNG header directly via Uint8Array index (NO DataView!)
            var pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
            var validPng = bytes.length >= 8;
            if (validPng) {
                for (var s = 0; s < 8; s++) {
                    if (bytes[s] !== pngSignature[s]) {
                        validPng = false;
                        break;
                    }
                }
            }
            if (!validPng) {
                var firstBytes = [];
                for (var dbg = 0; dbg < Math.min(8, bytes.length); dbg++) {
                    firstBytes.push(bytes[dbg]);
                }
                console.error("[Photoshop] Export produced invalid PNG! First 8 bytes: [" +
                    firstBytes.join(",") + "] (byteLength=" + bytes.length + ")");
                return null;
            }

            // Convert to base64 in chunks
            // CHUNK_SIZE must be a multiple of 3 so btoa() produces no padding
            // per chunk (only the final chunk may have padding).
            var base64 = "";
            var CHUNK_SIZE = 8190; // 2730 × 3 = no padding per chunk
            for (var i = 0; i < bytes.length; i += CHUNK_SIZE) {
                var chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
                var binary = "";
                for (var j = 0; j < chunk.length; j++) {
                    binary += String.fromCharCode(chunk[j]);
                }
                base64 += btoa(binary);
            }
            console.log("[Photoshop] Base64 encoded: " + base64.length + " chars");
            return `data:image/png;base64,${base64}`;

        } catch (e) {
            console.error("[Photoshop] Canvas export failed:", e.message || e);
            return null;
        } finally {
            // Cleanup temp file
            if (tempFile) {
                try { await tempFile.delete(); } catch (e) { /* ignore */ }
            }
        }
    },

    /**
     * List all pixel/raster layers in the active document.
     * Recursively traverses layer groups.
     *
     * @returns {Array<{id: number, name: string, kind: string, visible: boolean}>}
     */
    async listLayers() {
        const doc = this.getActiveDocument();
        if (!doc) return [];

        const layers = [];

        function traverse(layerList, depth = 0) {
            for (const layer of layerList) {
                const kind = layer.kind || "unknown";

                // Only include pixel/raster layers and smart objects
                if (kind === "pixel" || kind === "smartObject" || kind === "normal") {
                    layers.push({
                        id: layer.id,
                        name: layer.name,
                        kind: kind,
                        visible: layer.visible !== false,
                        depth: depth,
                        opacity: layer.opacity
                    });
                }

                // Recurse into layer groups
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
    },

    /**
     * Export a single layer by its ID as a base64 PNG.
     *
     * THREE separate executeAsModal calls with DOM document switching:
     *   Modal 1 – open tiny PNG + resize to match original dimensions
     *             + DOM-switch to original + select layer
     *             + duplicate (targetEnum) to container + DOM-switch back
     *   Modal 2 – saveAs.png (export ONLY, no lifecycle changes)
     *   Modal 3 – close container doc (cleanup ONLY)
     *
     * Uses DOM API ps.app.activeDocument = orig to switch documents
     * instead of batchPlay select (which is unreliable in UXP).
     * The original document is NEVER modified.
     *
     * @param {number} layerId - The layer ID to export
     * @returns {Promise<string|null>} base64 data URL or null on failure
     */
    async exportLayerAsBase64(layerId) {
        const { batchPlay, core, fs } = getPSModules();
        const doc = this.getActiveDocument();
        if (!doc || !batchPlay || !core || !fs) return null;

        var exportFile = null;
        var containerFile = null;
        var originalDocId = doc.id;
        var containerDocId = null;

        try {
            // 1. Create files OUTSIDE modal (no PS state change)
            const tempFolder = await fs.getTemporaryFolder();
            const timestamp = Date.now();

            // 1a. Output file for saveAs.png
            exportFile = await tempFolder.createFile(
                `turing_layer_${layerId}_${timestamp}.png`,
                { overwrite: true }
            );
            console.log("[Photoshop] Export file: " + exportFile.nativePath);

            // 1b. Tiny transparent 1x1 PNG as container document
            const MINI_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ" +
                "AAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
            containerFile = await tempFolder.createFile(
                `turing_container_${timestamp}.png`,
                { overwrite: true }
            );
            var binaryStr = atob(MINI_PNG_B64);
            var miniLen = binaryStr.length;
            var miniBytes = new Uint8Array(miniLen);
            for (var mi = 0; mi < miniLen; mi++) {
                miniBytes[mi] = binaryStr.charCodeAt(mi) & 0xFF;
            }
            await containerFile.write(miniBytes.buffer.slice(0, miniLen), { append: false });
            console.log("[Photoshop] Container PNG written");

            // 1c. Capture original document dimensions (before any modal)
            var origWidth = doc.width;
            var origHeight = doc.height;
            console.log("[Photoshop] Original doc dimensions: " +
                origWidth + "x" + origHeight);

            // === Modal 1: Open container + resize + duplicate target layer ===
            //     Uses DOM API to switch between documents, then
            //     batchPlay duplicate with targetEnum (same pattern
            //     as addImagesAsSmartObjects, just reversed).
            await core.executeAsModal(async function () {
                const ps = require("photoshop");
                var orig = ps.app.activeDocument; // Save original doc reference

                // 2a. Open tiny PNG as container document
                var token = await fs.createSessionToken(containerFile);
                await batchPlay([{
                    _obj: "open",
                    null: { _path: token, _kind: "local" },
                    _options: { dialogOptions: "dontDisplay" }
                }], { synchronousExecution: true });

                var container = ps.app.activeDocument;
                containerDocId = container.id;
                console.log("[Photoshop] Container doc opened: " + containerDocId);

                // 2b. Resize container to match original document dimensions.
                //     The 1x1 container MUST be expanded, otherwise the
                //     duplicated layer is clipped to a single pixel.
                console.log("[Photoshop] Resizing container to " +
                    origWidth + "x" + origHeight);
                try {
                    await batchPlay([{
                        _obj: "imageSize",
                        _target: {
                            _ref: "document",
                            _enum: "ordinal",
                            _value: "targetEnum"
                        },
                        width: { _unit: "pixelsUnit", _value: origWidth },
                        height: { _unit: "pixelsUnit", _value: origHeight },
                        constrainProportions: false,
                        _options: { dialogOptions: "dontDisplay" }
                    }], { synchronousExecution: true });
                    var resizedW = container.width;
                    var resizedH = container.height;
                    console.log("[Photoshop] Container resized to: " +
                        resizedW + "x" + resizedH);
                } catch (resizeErr) {
                    console.warn("[Photoshop] Container resize failed: " +
                        (resizeErr.message || resizeErr));
                }

                // 2c. Switch back to original doc via DOM API
                ps.app.activeDocument = orig;
                console.log("[Photoshop] Switched to original doc: " + orig.id);

                // 2d. Select the target layer in the original doc
                await batchPlay([{
                    _obj: "select",
                    _target: { _ref: "layer", _id: layerId },
                    makeVisible: true,
                    _options: { dialogOptions: "dontDisplay" }
                }], { synchronousExecution: true });
                console.log("[Photoshop] Layer " + layerId + " selected");

                // 2e. Duplicate to container doc (targetEnum = active layer)
                var dupResult = await batchPlay([{
                    _obj: "duplicate",
                    _target: {
                        _ref: "layer",
                        _enum: "ordinal",
                        _value: "targetEnum"
                    },
                    to: { _ref: "document", _id: containerDocId },
                    _options: { dialogOptions: "dontDisplay" }
                }], { synchronousExecution: true });

                console.log("[Photoshop] Layer " + layerId +
                    " duplicated to container " + containerDocId);
                if (dupResult && dupResult[0] &&
                    dupResult[0]._obj === "error") {
                    console.warn("[Photoshop] Duplicate warning: " +
                        JSON.stringify(dupResult));
                }

                // 2f. Switch back to container for verification
                ps.app.activeDocument = container;
                console.log("[Photoshop] Switched to container doc: " +
                    containerDocId);

                // Verify: count content layers in container
                var layerCount = 0;
                function countLayers(list) {
                    for (var l = 0; l < list.length; l++) {
                        var k = list[l].kind || "";
                        if (k === "pixel" || k === "smartObject" ||
                            k === "normal") layerCount++;
                        if (list[l].layers && list[l].layers.length > 0) {
                            countLayers(list[l].layers);
                        }
                    }
                }
                countLayers(ps.app.activeDocument.layers);
                console.log("[Photoshop] Container doc has " + layerCount +
                    " content layer(s) after duplicate");

            }, { commandName: "Create Container for Layer " + layerId });

            if (!containerDocId) {
                console.warn("[Photoshop] Container doc not created");
                return null;
            }

            // === Modal 2: Export ONLY (saveAs.png) ===
            await core.executeAsModal(async function () {
                const ps = require("photoshop");
                await ps.app.activeDocument.saveAs.png(
                    exportFile, null, true);
                console.log("[Photoshop] saveAs.png() completed");

            }, { commandName: "Export Layer " + layerId + " as PNG" });

            // === Modal 3: Close container ONLY ===
            await core.executeAsModal(async function () {
                await batchPlay([{
                    _obj: "close",
                    _target: { _ref: "document", _id: containerDocId },
                    saving: { _enum: "yesNo", _value: "no" },
                    _options: { dialogOptions: "dontDisplay" }
                }], { synchronousExecution: true });
                console.log("[Photoshop] Container doc " +
                    containerDocId + " closed");
                containerDocId = null;

            }, { commandName: "Close Container Document" });

            if (!exportFile) {
                console.warn("[Photoshop] Failed to create export file");
                return null;
            }

            // 3. Read the exported file
            var nativePath = exportFile.nativePath.replace(/\\/g, '/');
            var readFile = null;
            try {
                readFile = await fs.getEntryWithUrl("file:" + nativePath);
                console.log("[Photoshop] Layer fresh file: " + readFile.name);
            } catch (e) {
                readFile = exportFile;
            }

            // 4. Poll with retries
            var rawData = null;
            var MAX_RETRIES = 20;
            for (var retry = 0; retry < MAX_RETRIES; retry++) {
                await new Promise(function (r) { setTimeout(r, 200); });

                if (!readFile || readFile === exportFile) {
                    try { readFile = await fs.getEntryWithUrl("file:" + nativePath); } catch (e) {}
                }
                if (!readFile) continue;

                try {
                    rawData = await readFile.read({ format: require("uxp").storage.formats.binary });
                } catch (e) {
                    rawData = await readFile.read();
                }
                if (rawData && rawData.byteLength > 0) {
                    console.log("[Photoshop] Layer exported: " + rawData.byteLength +
                        " bytes (retry " + (retry + 1) + ")");
                    break;
                }
                console.log("[Photoshop] Layer retry " + (retry + 1) + "/" + MAX_RETRIES +
                    ": file still empty, waiting...");
            }

            if (!rawData || rawData.byteLength === 0) {
                console.warn("[Photoshop] Layer export produced empty file after " +
                    MAX_RETRIES + " retries");
                return null;
            }

            // 5. Convert to Uint8Array
            var bytes;
            if (rawData.buffer && typeof rawData.buffer.byteLength === "number") {
                bytes = rawData;
            } else {
                try { bytes = new Uint8Array(rawData); } catch (e) { bytes = null; }
            }
            if (!bytes || bytes.length === 0 || typeof bytes[0] === "undefined") {
                console.warn("[Photoshop] Layer bytes invalid, reconstructing (len=" +
                    (rawData.byteLength || rawData.length) + ")");
                var recLen = rawData.byteLength || rawData.length || 0;
                bytes = new Uint8Array(recLen);
                for (var bi = 0; bi < recLen; bi++) { bytes[bi] = rawData[bi] || 0; }
            }

            // Validate PNG header
            var pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
            var validPng = bytes.length >= 8;
            if (validPng) {
                for (var s = 0; s < 8; s++) {
                    if (bytes[s] !== pngSignature[s]) { validPng = false; break; }
                }
            }
            if (!validPng) {
                var firstBytes = [];
                for (var dbg = 0; dbg < Math.min(8, bytes.length); dbg++) {
                    firstBytes.push(bytes[dbg]);
                }
                console.error("[Photoshop] Export produced invalid PNG! First 8 bytes: [" +
                    firstBytes.join(",") + "] (byteLength=" + bytes.length + ")");
                return null;
            }

            // 6. Convert to base64 in chunks
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

            console.log("[Photoshop] Layer base64: " + base64.length + " chars");
            return `data:image/png;base64,${base64}`;

        } catch (e) {
            console.error("[Photoshop] Layer export failed:", e);

            // Emergency cleanup: close container doc if it still exists
            if (containerDocId) {
                try {
                    const { core: rescueCore, batchPlay: rescueBP } = getPSModules();
                    if (rescueCore && rescueBP) {
                        await rescueCore.executeAsModal(async function () {
                            await rescueBP([{
                                _obj: "close",
                                _target: { _ref: "document", _id: containerDocId },
                                saving: { _enum: "yesNo", _value: "no" },
                                _options: { dialogOptions: "dontDisplay" }
                            }], { synchronousExecution: true });
                            console.log("[Photoshop] Emergency closed container " + containerDocId);
                        }, { commandName: "Emergency Close Container" });
                    }
                } catch (e2) {
                    console.error("[Photoshop] Emergency close failed:", e2);
                }
            }

            return null;
        } finally {
            if (exportFile) {
                try { await exportFile.delete(); } catch (e) { /* ignore */ }
            }
            if (containerFile) {
                try { await containerFile.delete(); } catch (e) { /* ignore */ }
            }
        }
    },

    /**
     * Place generated images as Smart Objects in the active document.
     * Uses open+duplicate instead of placeEvent for UXP reliability.
     *
     * @param {string[]} base64Array - Array of "data:image/png;base64,..." strings
     * @returns {Promise<number>} Number of successfully placed images
     */
    async addImagesAsSmartObjects(base64Array) {
        var modules = getPSModules();
        var batchPlay = modules.batchPlay;
        var core = modules.core;
        var fs = modules.fs;
        var doc = this.getActiveDocument();
        if (!doc || !batchPlay || !core || !fs || !base64Array.length) {
            console.error("[Photoshop] addImagesAsSmartObjects: missing modules/doc/images");
            return 0;
        }

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
                    // 1. Decode base64 and write to temp file
                    var parts = base64Str.split(",");
                    var header = parts[0];
                    var data = parts[1];
                    if (!data) {
                        console.error("[Photoshop] Invalid base64 data for image " + i);
                        continue;
                    }

                    var ext = "png";
                    if (header && header.indexOf("image/jpeg") >= 0) ext = "jpg";

                    var fileName = "turing_gen_" + timestamp + "_" + i + "." + ext;
                    tempFile = await tempFolder.createFile(fileName, { overwrite: true });
                    tempFiles.push(tempFile);

                    // Decode base64 → binary
                    var binaryStr = atob(data);
                    var len = binaryStr.length;
                    var bytes = new Uint8Array(len);
                    for (var j = 0; j < len; j++) {
                        bytes[j] = binaryStr.charCodeAt(j) & 0xFF;
                    }
                    await tempFile.write(bytes.buffer.slice(0, len), { append: false });

                    console.log("[Photoshop] Temp file written: " + tempFile.nativePath + " (" + len + " bytes)");

                    // 2. Create session token (required for UXP batchPlay file operations)
                    var token = await fs.createSessionToken(tempFile);

                    // 3-7. All state-modifying PS operations MUST run inside executeAsModal
                    var layerName = await core.executeAsModal(async function (ctx) {
                        // 3. Open the PNG as a new document via session token
                        var openResult = await batchPlay(
                            [{
                                _obj: "open",
                                null: {
                                    _path: token,
                                    _kind: "local"
                                },
                                _options: { dialogOptions: "dontDisplay" }
                            }],
                            { synchronousExecution: true }
                        );
                        console.log("[Photoshop] Open result: " + JSON.stringify(openResult));

                        // 4. Resize the temp document to fit target canvas BEFORE duplicating
                        //    Uses Adobe's documented imageSize API: width + constrainProportions only
                        var app = require("photoshop").app;
                        var tempDoc = app.activeDocument;
                        var tempW = tempDoc.width;
                        var tempH = tempDoc.height;
                        var scaleW = targetDocW / tempW;
                        var scaleH = targetDocH / tempH;
                        var fitScale = Math.min(scaleW, scaleH);
                        // Only skip resize if dimensions match within 0.1% (effectively identical)
                        if (Math.abs(fitScale - 1.0) < 0.001) {
                            console.log("[Photoshop] Temp doc already matches canvas: " + tempW + "x" + tempH + ", skipping resize");
                        } else {
                            var newW = Math.round(tempW * fitScale);
                            var newH = Math.round(tempH * fitScale);
                            console.log("[Photoshop] Temp doc: " + tempW + "x" + tempH + " → " + newW + "x" + newH + " (scale: " + fitScale.toFixed(3) + ", direction: " + (fitScale < 1.0 ? "down" : "up") + ")");

                            try {
                                var imageSizeResult = await batchPlay(
                                    [{
                                        _obj: "imageSize",
                                        _target: {
                                            _ref: "document",
                                            _enum: "ordinal",
                                            _value: "targetEnum"
                                        },
                                        width: { _unit: "pixelsUnit", _value: newW },
                                        constrainProportions: true,
                                        _options: { dialogOptions: "dontDisplay" }
                                    }],
                                    { synchronousExecution: true }
                                );
                                // Verify: did the document actually resize?
                                var actualW = tempDoc.width;
                                var actualH = tempDoc.height;
                                if (Math.abs(actualW - tempW) > 1) {
                                    console.log("[Photoshop] Temp doc resized to: " + actualW + "x" + actualH);
                                } else if (imageSizeResult && imageSizeResult[0] && imageSizeResult[0]._obj === "error") {
                                    console.warn("[Photoshop] imageSize error: " + JSON.stringify(imageSizeResult));
                                } else {
                                    console.warn("[Photoshop] imageSize returned OK but dimensions unchanged (" + actualW + "x" + actualH + ")");
                                }
                            } catch (resizeErr) {
                                console.warn("[Photoshop] imageSize failed: " + (resizeErr.message || resizeErr) + ", skipping resize");
                            }
                        }

                        // 5. Duplicate the layer to the original document
                        var dupResult = await batchPlay(
                            [{
                                _obj: "duplicate",
                                _target: {
                                    _ref: "layer",
                                    _enum: "ordinal",
                                    _value: "targetEnum"
                                },
                                to: {
                                    _ref: "document",
                                    _id: targetDocId
                                },
                                _options: { dialogOptions: "dontDisplay" }
                            }],
                            { synchronousExecution: true }
                        );
                        console.log("[Photoshop] Duplicate result: " + JSON.stringify(dupResult));

                        // 6. Close the temp document without saving
                        await batchPlay(
                            [{
                                _obj: "close",
                                _target: {
                                    _ref: "document",
                                    _enum: "ordinal",
                                    _value: "targetEnum"
                                },
                                saving: {
                                    _enum: "yesNo",
                                    _value: "no"
                                },
                                _options: { dialogOptions: "dontDisplay" }
                            }],
                            { synchronousExecution: true }
                        );

                        // 7. Convert to Smart Object
                        await batchPlay(
                            [{ _obj: "newPlacedLayer" }],
                            { synchronousExecution: true }
                        );
                        console.log("[Photoshop] Layer converted to Smart Object");

                        // 8. Rename the placed layer in the original document
                        var ln = "Turing-" + timestamp + "-" + (i + 1);
                        await batchPlay(
                            [{
                                _obj: "set",
                                _target: {
                                    _ref: "layer",
                                    _enum: "ordinal",
                                    _value: "targetEnum"
                                },
                                to: {
                                    _obj: "layer",
                                    name: ln
                                },
                                _options: { dialogOptions: "dontDisplay" }
                            }],
                            { synchronousExecution: true }
                        );
                        console.log("[Photoshop] Layer renamed to: " + ln);

                        return ln;
                    }, { commandName: "Place Turing Image " + (i + 1) });

                    placedCount++;
                    console.log("[Photoshop] Successfully placed image " + i + " as: " + layerName);

                } catch (placeErr) {
                    console.error("[Photoshop] Failed to place image " + i + ":", placeErr.message || placeErr);
                    // Try to close any orphaned temp document (inside modal if needed)
                }
            }

        } catch (e) {
            console.error("[Photoshop] addImagesAsSmartObjects outer error:", e.message || e);
        } finally {
            // Cleanup temp files
            for (var k = 0; k < tempFiles.length; k++) {
                try { await tempFiles[k].delete(); } catch (e) { /* ignore */ }
            }
        }

        return placedCount;
    }
};

// Expose globally for non-module script loading (UXP compatibility)
window.ps = ps;
