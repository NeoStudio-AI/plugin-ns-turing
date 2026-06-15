/* ============================================================
   NS Turing - Reference Images Component
   Handles: upload, canvas toggle, layer toggle, thumbnail grid
   ============================================================ */

/**
 * Initialize reference images UI.
 */
function initReferences() {
    const els = window.__els;
    if (!els) return;

    // Canvas reference checkbox
    if (els.chkCanvasRef) {
        els.chkCanvasRef.addEventListener("change", () => {
            window.state.set("canvasAsRef", els.chkCanvasRef.checked);
            updateRefCount();
        });
    }

    // Layer reference checkbox
    if (els.chkLayerRef) {
        els.chkLayerRef.addEventListener("change", () => {
            const checked = els.chkLayerRef.checked;
            window.state.set("layersAsRef", checked);
            if (els.layerPickerContainer) {
                els.layerPickerContainer.classList.toggle("hidden", !checked);
            }
            updateRefCount();
        });
    }

    // Upload button — use UXP native file picker
    if (els.btnUploadRef) {
        els.btnUploadRef.addEventListener("click", async () => {
            try {
                const uxp = require("uxp");
                const fs = uxp.storage.localFileSystem;
                const fileTypes = uxp.storage.fileTypes;

                const files = await fs.getFileForOpening({
                    allowMultiple: true,
                    types: fileTypes.images
                });

                if (!files || files.length === 0) return;

                const currentRefs = window.state.get("uploadedRefs") || [];
                const remainingSlots = window.CONFIG.maxReferenceImages - currentRefs.length;

                if (remainingSlots <= 0) {
                    window.state.set("status", `最多支持 ${window.CONFIG.maxReferenceImages} 张参考图`);
                    window.state.set("statusType", "error");
                    return;
                }

                const toAdd = Math.min(files.length, remainingSlots);
                const newRefs = [];

                for (let i = 0; i < toAdd; i++) {
                    try {
                        const dataUrl = await uxpFileToDataUrl(files[i]);
                        newRefs.push({
                            id: Date.now() + i,
                            label: files[i].name,
                            dataUrl: dataUrl,
                            source: "upload"
                        });
                    } catch (e) {
                        console.error("[References] Failed to read file:", files[i].name, e);
                    }
                }

                if (files.length > remainingSlots) {
                    window.state.set("status", `已截取前 ${remainingSlots} 张，超出 ${window.CONFIG.maxReferenceImages} 张上限`);
                    window.state.set("statusType", "warning");
                }

                if (newRefs.length > 0) {
                    const updated = [...currentRefs, ...newRefs];
                    window.state.set("uploadedRefs", updated);
                    renderRefGrid(updated);
                    updateRefCount();
                }
            } catch (e) {
                console.error("[References] File picker failed:", e);
            }
        });
    }

    // React to uploaded refs state changes
    window.state.on("uploadedRefs", (refs) => {
        renderRefGrid(refs);
        updateRefCount();
    });

    // React to canvasAsRef changes
    window.state.on("canvasAsRef", () => updateRefCount());

    // React to layersAsRef and selectedLayerIds changes
    window.state.on("layersAsRef", () => updateRefCount());
    window.state.on("selectedLayerIds", () => updateRefCount());
}

/**
 * Read a UXP File entry and return a base64 data URL.
 * Uses binary read + chunked btoa (same pattern as photoshop.js).
 */
async function uxpFileToDataUrl(file) {
    if (!file || !file.name) {
        throw new Error("Invalid UXP file entry");
    }

    const formats = require("uxp").storage.formats;

    // Use explicit binary format
    let rawData = null;
    try {
        rawData = await file.read({ format: formats.binary });
    } catch (e) {
        rawData = await file.read(); // fallback
    }

    if (!rawData || rawData.byteLength === 0) {
        throw new Error("Empty or unreadable file");
    }

    // Ensure we have a valid indexable Uint8Array
    let bytes;
    if (rawData.buffer && typeof rawData.buffer.byteLength === "number") {
        bytes = rawData;
    } else {
        try {
            bytes = new Uint8Array(rawData);
        } catch (e) {
            bytes = null;
        }
    }

    // Reconstruct if invalid
    if (!bytes || bytes.length === 0 || typeof bytes[0] === "undefined") {
        const reconstructLen = rawData.byteLength || rawData.length || 0;
        bytes = new Uint8Array(reconstructLen);
        for (let bi = 0; bi < reconstructLen; bi++) {
            bytes[bi] = rawData[bi] || 0;
        }
    }

    // Convert to base64 in chunks (CHUNK_SIZE must be multiple of 3)
    let base64 = "";
    const CHUNK_SIZE = 8190;
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
        let binary = "";
        for (let j = 0; j < chunk.length; j++) {
            binary += String.fromCharCode(chunk[j]);
        }
        base64 += btoa(binary);
    }

    // Guess MIME from extension
    const ext = file.name.split(".").pop().toLowerCase();
    const mimeMap = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        bmp: "image/bmp",
        tiff: "image/tiff",
        tif: "image/tiff"
    };
    const mime = mimeMap[ext] || "image/png";

    return `data:${mime};base64,${base64}`;
}

/**
 * Re-render the reference image thumbnail grid.
 */
function renderRefGrid(refs) {
    const grid = window.__els.refGrid;
    if (!grid) return;

    grid.innerHTML = "";

    if (!refs || refs.length === 0) return;

    refs.forEach((ref, index) => {
        const item = document.createElement("div");
        item.className = "ref-item";

        const img = document.createElement("img");
        img.src = ref.dataUrl;
        img.title = ref.label || `参考图 #${index + 1}`;

        const label = document.createElement("div");
        label.className = "ref-label";
        label.textContent = ref.label
            ? (ref.label.length > 8 ? ref.label.slice(0, 7) + "..." : ref.label)
            : `#${index + 1}`;

        const removeBtn = document.createElement("span");
        removeBtn.className = "ref-remove";
        removeBtn.setAttribute("role", "button");
        removeBtn.setAttribute("tabindex", "0");
        removeBtn.innerHTML = iconSpan('close');
        removeBtn.title = "移除";
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const current = window.state.get("uploadedRefs") || [];
            const updated = current.filter((_, i) => i !== index);
            window.state.set("uploadedRefs", updated);
        });

        item.appendChild(img);
        item.appendChild(label);
        item.appendChild(removeBtn);
        grid.appendChild(item);
    });
}

/**
 * Update the reference count badge.
 */
function updateRefCount() {
    const els = window.__els;
    if (!els || !els.refCount) return;

    const uploadedCount = (window.state.get("uploadedRefs") || []).length;
    const canvasAsRef = window.state.get("canvasAsRef") ? 1 : 0;
    const layersAsRef = window.state.get("layersAsRef") ? (window.state.get("selectedLayerIds") || []).length : 0;
    const total = uploadedCount + canvasAsRef + layersAsRef;

    els.refCount.textContent = `${total}/${window.CONFIG.maxReferenceImages}`;

    // Highlight if getting close to limit
    els.refCount.style.color = total >= window.CONFIG.maxReferenceImages ? "var(--color-danger)" : "";
}

// Expose globally for non-module script loading (UXP compatibility)
window.initReferences = initReferences;
