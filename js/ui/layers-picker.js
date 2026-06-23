/* ============================================================
   NS Turing - Layer Picker Component
   Lists pixel layers from the document for reference selection.
   ============================================================ */

/**
 * Initialize layer picker: refresh button and checkbox change handling.
 */
function initLayersPicker() {
    const els = window.__els;
    if (!els) return;

    // Refresh layers button
    if (els.btnRefreshLayers) {
        els.btnRefreshLayers.addEventListener("click", async () => {
            await loadLayers();
        });
    }

    // React to layersAsRef: load layers when enabled
    window.state.on("layersAsRef", async (enabled) => {
        if (enabled) {
            await loadLayers();
        }
    });
}

/**
 * Load layers from Photoshop and render the layer list.
 */
async function loadLayers() {
    const els = window.__els;
    if (!els || !els.layerList) return;

    try {
        els.btnRefreshLayers.textContent = "加载中...";
        els.btnRefreshLayers.classList.add("disabled");

        const layers = await window.ps.listLayers();
        window.state.set("availableLayers", layers);
        renderLayerList(layers);

        els.btnRefreshLayers.textContent = "刷新图层";
        els.btnRefreshLayers.classList.remove("disabled");
    } catch (e) {
        console.error("[LayersPicker] Failed to load layers:", e);
        els.btnRefreshLayers.textContent = "刷新失败，重试";
        els.btnRefreshLayers.classList.remove("disabled");
    }
}

/**
 * Render the layer checkbox list.
 */
function renderLayerList(layers) {
    const listEl = window.__els.layerList;
    if (!listEl) return;

    const selectedIds = window.state.get("selectedLayerIds") || [];
    listEl.innerHTML = "";

    if (!layers || layers.length === 0) {
        listEl.innerHTML = '<div class="layer-item" style="color: var(--color-text-muted)">暂无像素图层</div>';
        return;
    }

    layers.forEach((layer, index) => {
        const item = document.createElement("label");
        item.className = "layer-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = layer.id;
        checkbox.checked = selectedIds.includes(layer.id);
        checkbox.addEventListener("change", () => {
            const current = window.state.get("selectedLayerIds") || [];
            const updated = checkbox.checked
                ? [...current, layer.id]
                : current.filter(id => id !== layer.id);
            window.state.set("selectedLayerIds", updated);
        });

        const nameSpan = document.createElement("span");
        const indent = "  ".repeat(layer.depth || 0);
        const kindLabel = layer.kind === "smartObject" ? "[智能对象]" : "[像素]";
        nameSpan.textContent = `${indent}${layer.name} ${kindLabel}`;

        item.appendChild(checkbox);
        item.appendChild(nameSpan);
        listEl.appendChild(item);
    });
}

// Expose globally for non-module script loading (UXP compatibility)
window.initLayersPicker = initLayersPicker;
