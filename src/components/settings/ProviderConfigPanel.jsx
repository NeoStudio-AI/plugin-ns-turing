import { useState, useEffect } from "react";
import { PROVIDER_TYPE_INFO } from "../../config.js";
import { fetchOpenAIImageModels, fetchGeminiImageModels } from "../../utils/fetch-models.js";
import { Icon } from "../../utils/icons.jsx";

/**
 * Step 2: Configure provider API Key, URL, and select models.
 * Props: provider, onSave(apiKey, apiUrl, selectedModels), onBack
 */
export default function ProviderConfigPanel({ provider, onSave, onBack }) {
    var typeInfo = PROVIDER_TYPE_INFO[provider.type] || {};

    var [apiKey, setApiKey] = useState(provider.apiKey || "");
    var [apiUrl, setApiUrl] = useState(provider.apiUrl || typeInfo.defaultApiUrl || "");
    var [keyVisible, setKeyVisible] = useState(false);
    var [availableModels, setAvailableModels] = useState([]);
    var [checkedIds, setCheckedIds] = useState({});
    var [fetchStatus, setFetchStatus] = useState({ message: "", type: "" });
    var [fetching, setFetching] = useState(false);
    var [saveError, setSaveError] = useState("");
    var [saving, setSaving] = useState(false);

    // Initialize checked IDs from provider models
    useEffect(function () {
        var savedModels = provider.models || [];
        var ids = {};
        savedModels.forEach(function (m) {
            if (m.enabled !== false) ids[m.id] = true;
        });
        setCheckedIds(ids);
    }, [provider]);

    function toggleChecked(modelId) {
        setCheckedIds(function (prev) {
            var next = Object.assign({}, prev);
            if (next[modelId]) {
                delete next[modelId];
            } else {
                next[modelId] = true;
            }
            return next;
        });
    }

    async function handleFetchModels() {
        if (!apiKey.trim()) {
            setSaveError("请先输入 API 密钥");
            return;
        }
        if (!apiUrl.trim()) {
            setSaveError("请先输入 API 地址");
            return;
        }
        setSaveError("");
        setFetching(true);
        setFetchStatus({ message: "正在获取模型列表...", type: "" });

        try {
            var models = [];
            if (provider.type === "openai") {
                models = await fetchOpenAIImageModels(apiUrl.trim(), apiKey.trim());
            } else if (provider.type === "gemini") {
                models = await fetchGeminiImageModels(apiUrl.trim(), apiKey.trim());
            } else {
                throw new Error("不支持的服务商类型: " + provider.type);
            }

            if (models.length === 0) {
                setFetchStatus({ message: "未找到可用的图片生成模型", type: "error" });
            } else {
                setAvailableModels(models);
                setFetchStatus({ message: "找到 " + models.length + " 个可用模型，请勾选需要调用的模型", type: "success" });
            }
        } catch (e) {
            console.error("[Settings] Fetch models failed:", e);
            setFetchStatus({ message: "获取失败，请检查 API Key 和地址是否正确", type: "error" });
        } finally {
            setFetching(false);
        }
    }

    function handleSave() {
        var key = apiKey.trim();
        var url = apiUrl.trim();

        if (!key) { setSaveError("请输入 API 密钥"); return; }
        if (!url) { setSaveError("请输入 API 地址"); return; }

        var selectedModels = [];
        Object.keys(checkedIds).forEach(function (modelId) {
            var found = availableModels.find(function (m) { return m.id === modelId; });
            selectedModels.push({
                id: modelId,
                name: found ? found.name : modelId,
                enabled: true
            });
        });

        if (selectedModels.length === 0) {
            setSaveError("请至少勾选一个模型（先点击'获取模型列表'）");
            return;
        }

        setSaveError("");
        setSaving(true);
        onSave(key, url, selectedModels);
    }

    // Handle Enter key in inputs
    function handleKeyDown(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
        }
    }

    return (
        <div className="provider-config-panel">
            <div className="provider-form-header">
                <span className="settings-section-title">
                    {"配置 " + provider.name + " (" + (typeInfo.label || provider.type) + ")"}
                </span>
                <span className="icon-btn" role="button" tabIndex="0" onClick={onBack} title="返回">
                    <Icon name="close" />
                </span>
            </div>

            <div className="form-group">
                <label className="form-label">API 密钥</label>
                <div className="form-input-wrapper">
                    <sp-textfield
                        key={keyVisible ? "visible" : "hidden"}
                        type={keyVisible ? "text" : "password"}
                        size="m"
                        quiet
                        placeholder="sk-... 或 AIza..."
                        value={apiKey}
                        onInput={function (e) { setApiKey(e.target.value); }}
                        onKeyDown={handleKeyDown}
                    />
                    <span className="toggle-key-btn" role="button" tabIndex="0"
                        title={keyVisible ? "隐藏" : "显示"}
                        onClick={function () { setKeyVisible(!keyVisible); }}>
                        <Icon name={keyVisible ? "eye" : "eye-off"} />
                    </span>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">API 地址</label>
                <div className="form-input-wrapper">
                    <sp-textfield
                        type="text"
                        size="m"
                        quiet
                        placeholder="https://api.openai.com"
                        value={apiUrl}
                        onInput={function (e) { setApiUrl(e.target.value); }}
                        onKeyDown={handleKeyDown}
                    />
                </div>
            </div>

            <span role="button" tabIndex={0} className={"small-btn fetch-btn" + (fetching ? " disabled" : "")} onClick={fetching ? undefined : handleFetchModels} onKeyDown={function (e) { if (!fetching && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleFetchModels(); } }}>
                {fetching ? "获取中..." : "获取模型列表"}
            </span>
            {fetchStatus.message && (
                <span className={"fetch-status" + (fetchStatus.type ? " " + fetchStatus.type : "")}>
                    {fetchStatus.message}
                </span>
            )}

            {/* Model Checkbox List */}
            {availableModels.length > 0 && (
                <div className="model-checkbox-list">
                    {availableModels.map(function (model) {
                        var label = model.name && model.name !== model.id ? model.name + " · " + model.id : model.id;
                        var display = label.length > 42 ? label.slice(0, 39) + "..." : label;
                        var isChecked = !!checkedIds[model.id];
                        return (
                            <div
                                key={model.id}
                                role="checkbox"
                                aria-checked={isChecked}
                                tabIndex={0}
                                className="model-checkbox-row"
                                title={label}
                                onClick={function () { toggleChecked(model.id); }}
                                onKeyDown={function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleChecked(model.id); } }}
                            >
                                <sp-checkbox
                                    size="m"
                                    checked={isChecked ? "" : undefined}
                                    tabIndex={-1}
                                />
                                <span className="model-checkbox-label">{display}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {saveError && <div className="settings-status error">{saveError}</div>}

            <span
                role="button"
                tabIndex={0}
                className={"generate-btn" + (saving ? " disabled" : "")}
                onClick={saving ? undefined : handleSave}
                onKeyDown={function (e) { if (!saving && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleSave(); } }}
            >
                {saving ? "保存中..." : "保存配置"}
            </span>
        </div>
    );
}
