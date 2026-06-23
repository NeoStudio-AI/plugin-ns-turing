import { useState, useCallback } from "react";
import { useTuringState, useTuringDispatch } from "../context/TuringContext.jsx";
import { listLayers } from "../photoshop.js";

/**
 * LayerPicker - Lists pixel/smart-object layers from the active PS document.
 * Shown only when the "图层参考" checkbox is enabled.
 */
export default function LayerPicker() {
    const state = useTuringState();
    const dispatch = useTuringDispatch();
    const [loading, setLoading] = useState(false);
    const availableLayers = state.availableLayers || [];
    const selectedIds = state.selectedLayerIds || [];

    // Load layers from Photoshop
    const handleRefresh = useCallback(async () => {
        setLoading(true);
        try {
            const layers = await listLayers();
            dispatch({ type: "SET", key: "availableLayers", value: layers });
        } catch (e) {
            console.error("[LayerPicker] Failed to load layers:", e);
        } finally {
            setLoading(false);
        }
    }, [dispatch]);

    // Toggle a layer's selection
    const handleToggleLayer = useCallback((layerId) => {
        const current = selectedIds;
        const updated = current.includes(layerId)
            ? current.filter(function (id) { return id !== layerId; })
            : [...current, layerId];
        dispatch({ type: "SET", key: "selectedLayerIds", value: updated });
    }, [selectedIds, dispatch]);

    return (
        <div className="layer-picker">
            <span
                role="button"
                tabIndex={0}
                className={"small-btn" + (loading ? " disabled" : "")}
                onClick={loading ? undefined : handleRefresh}
                onKeyDown={function (e) { if (!loading && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleRefresh(); } }}
            >
                {loading ? "加载中..." : "刷新图层"}
            </span>

            <div className="layer-list">
                {!availableLayers || availableLayers.length === 0 ? (
                    <div className="layer-item muted">
                        暂无像素图层
                    </div>
                ) : (
                    availableLayers.map(function (layer) {
                        var indent = "\u00A0\u00A0".repeat(layer.depth || 0);
                        var kindLabel = layer.kind === "smartObject" ? "智能对象" : "像素";
                        var isChecked = selectedIds.includes(layer.id);
                        return (
                            <div
                                className={"layer-item" + (isChecked ? " checked" : "")}
                                key={layer.id}
                                title={layer.name}
                                onClick={function () { handleToggleLayer(layer.id); }}
                                role="checkbox"
                                aria-checked={isChecked}
                                tabIndex={0}
                                onKeyDown={function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleToggleLayer(layer.id); } }}
                            >
                                <sp-checkbox
                                    size="m"
                                    checked={isChecked ? "" : undefined}
                                    tabIndex={-1}
                                />
                                <span>{indent}{layer.name}</span>
                                <span className="layer-kind">{kindLabel}</span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
