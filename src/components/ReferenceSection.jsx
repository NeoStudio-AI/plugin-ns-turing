import { useCallback, useMemo } from "react";
import { useTuringState, useTuringDispatch } from "../context/TuringContext.jsx";
import { CONFIG } from "../config.js";
import { pickImageFiles, uxpFileToDataUrl } from "../photoshop.js";
import { Icon } from "../utils/icons.jsx";
import LayerPicker from "./LayerPicker.jsx";

/**
 * ReferenceSection - 参考图 section with upload, canvas/layer toggles,
 * layer picker, and thumbnail grid.
 */
export default function ReferenceSection() {
    const state = useTuringState();
    const dispatch = useTuringDispatch();
    const uploadedRefs = state.uploadedRefs || [];
    const maxRefs = CONFIG.maxReferenceImages || 10;

    // Compute reference count
    const refCount = useMemo(function () {
        var uploaded = uploadedRefs.length;
        var canvas = state.canvasAsRef ? 1 : 0;
        var layers = state.layersAsRef ? (state.selectedLayerIds || []).length : 0;
        return uploaded + canvas + layers;
    }, [uploadedRefs, state.canvasAsRef, state.layersAsRef, state.selectedLayerIds]);

    // Toggle canvas as reference
    const handleCanvasToggle = useCallback(function () {
        dispatch({ type: "SET", key: "canvasAsRef", value: !state.canvasAsRef });
    }, [dispatch, state.canvasAsRef]);

    // Toggle layers as reference
    const handleLayersToggle = useCallback(function () {
        dispatch({ type: "SET", key: "layersAsRef", value: !state.layersAsRef });
    }, [dispatch, state.layersAsRef]);

    // Upload reference images via UXP file picker
    const handleUpload = useCallback(async function () {
        try {
            var files = await pickImageFiles(true);
            if (!files || files.length === 0) return;

            var remainingSlots = maxRefs - uploadedRefs.length;
            if (remainingSlots <= 0) {
                dispatch({ type: "SET_MULTI", payload: {
                    status: "最多支持 " + maxRefs + " 张参考图",
                    statusType: "error"
                }});
                return;
            }

            var toAdd = Math.min(files.length, remainingSlots);
            var newRefs = [];

            for (var i = 0; i < toAdd; i++) {
                try {
                    var dataUrl = await uxpFileToDataUrl(files[i]);
                    newRefs.push({
                        id: Date.now() + i,
                        label: files[i].name,
                        dataUrl: dataUrl,
                        source: "upload"
                    });
                } catch (e) {
                    console.error("[ReferenceSection] Failed to read file:", files[i].name, e);
                }
            }

            if (files.length > remainingSlots) {
                dispatch({ type: "SET_MULTI", payload: {
                    status: "已截取前 " + remainingSlots + " 张，超出 " + maxRefs + " 张上限",
                    statusType: "warning"
                }});
            }

            if (newRefs.length > 0) {
                var updated = [...uploadedRefs, ...newRefs];
                dispatch({ type: "SET", key: "uploadedRefs", value: updated });
            }
        } catch (e) {
            console.error("[ReferenceSection] Upload failed:", e);
        }
    }, [dispatch, uploadedRefs, maxRefs]);

    // Remove a reference by index
    const handleRemoveRef = useCallback(function (index) {
        var updated = uploadedRefs.filter(function (_, i) { return i !== index; });
        dispatch({ type: "SET", key: "uploadedRefs", value: updated });
    }, [dispatch, uploadedRefs]);

    return (
        <div className="section">
            {/* Header */}
            <div className="section-header">
                <span className="section-label">参考图</span>
                <span className="badge" style={{ color: refCount >= maxRefs ? "var(--color-danger)" : "" }}>
                    {refCount}/{maxRefs}
                </span>
            </div>

            {/* Reference card — visual grouping */}
            <div className="reference-card">

            {/* Canvas reference checkbox — click whole row to toggle */}
            <div
                role="checkbox"
                aria-checked={state.canvasAsRef ? "true" : "false"}
                tabIndex={0}
                className="ref-checkbox-row"
                onClick={handleCanvasToggle}
                onKeyDown={function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleCanvasToggle(); } }}
            >
                <sp-checkbox
                    size="m"
                    checked={state.canvasAsRef ? "" : undefined}
                    tabIndex={-1}
                />
                <span>使用当前画布作为参考图</span>
            </div>

            {/* Layer reference checkbox — click whole row to toggle */}
            <div
                role="checkbox"
                aria-checked={state.layersAsRef ? "true" : "false"}
                tabIndex={0}
                className="ref-checkbox-row"
                onClick={handleLayersToggle}
                onKeyDown={function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleLayersToggle(); } }}
            >
                <sp-checkbox
                    size="m"
                    checked={state.layersAsRef ? "" : undefined}
                    tabIndex={-1}
                />
                <span>从图层选择参考图</span>
            </div>

            {/* Layer picker (shown when layers as ref enabled) */}
            {state.layersAsRef ? <LayerPicker /> : null}

            {/* Uploaded reference thumbnail grid */}
            {uploadedRefs.length > 0 ? (
                <div className="ref-grid">
                    {uploadedRefs.map(function (ref, index) {
                        var label = ref.label || ("#" + (index + 1));
                        return (
                            <div className="ref-item" key={ref.id}>
                                <img src={ref.dataUrl} alt="" title={ref.label} />
                                <div className="ref-label">{label}</div>
                                <span
                                    className="ref-remove"
                                    role="button"
                                    tabIndex={0}
                                    title="移除"
                                    onClick={function (e) { e.stopPropagation(); handleRemoveRef(index); }}
                                >
                                    <Icon name="close" width={14} height={14} />
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : null}

            {/* Upload button */}
            <span role="button" tabIndex={0} className="small-btn" onClick={handleUpload} onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleUpload(); } }}>
                + 上传参考图
            </span>

            </div>
        </div>
    );
}
