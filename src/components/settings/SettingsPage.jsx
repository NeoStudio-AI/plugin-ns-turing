import { useState } from "react";
import { useTuringState, useTuringDispatch } from "../../context/TuringContext.jsx";
import { CONFIG, deriveFlatModels, composeModelKey, parseModelKey } from "../../config.js";
import { saveConfig } from "../../storage.js";
import { Icon } from "../../utils/icons.jsx";
import ProviderList from "./ProviderList.jsx";
import ProviderForm from "./ProviderForm.jsx";
import ProviderConfigPanel from "./ProviderConfigPanel.jsx";

/** Simple UUID generator for provider IDs */
function generateId() {
    return "prov_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

/**
 * Settings page orchestrator.
 * Manages view navigation (list/form/config) and all CRUD operations.
 */
export default function SettingsPage() {
    var state = useTuringState();
    var dispatch = useTuringDispatch();

    // Internal navigation state
    var [view, setView] = useState("list"); // "list" | "form" | "config" | "deleteConfirm"
    var [editingId, setEditingId] = useState(null);
    var [configuringId, setConfiguringId] = useState(null);
    var [deletingId, setDeletingId] = useState(null);
    var [status, setStatus] = useState({ message: "", type: "" });

    var providers = state.turingConfig ? state.turingConfig.providers || [] : [];

    function clearStatus() { setStatus({ message: "", type: "" }); }

    // === Navigation ===
    function handleAddProvider() {
        clearStatus();
        setEditingId(null);
        setView("form");
    }

    function handleEditProvider(providerId) {
        clearStatus();
        setEditingId(providerId);
        setView("form");
    }

    function handleConfigureProvider(providerId) {
        clearStatus();
        setConfiguringId(providerId);
        setView("config");
    }

    function handleBackToList() {
        clearStatus();
        setConfiguringId(null);
        setView("list");
    }

    function handleCancelForm() {
        clearStatus();
        setEditingId(null);
        setView("list");
    }

    // === Close settings ===
    function handleCloseSettings() {
        dispatch({ type: "SET", key: "showSettings", value: false });
    }

    // === Save Provider (Step 1) ===
    async function handleSaveProvider(name, type) {
        console.log("[Settings] handleSaveProvider called:", name, type);
        var config = state.turingConfig;
        if (!config) { console.error("[Settings] No turingConfig!"); return; }

        var newProviders = config.providers.map(function (p) { return Object.assign({}, p); });

        if (editingId) {
            // Edit existing
            var idx = newProviders.findIndex(function (p) { return p.id === editingId; });
            if (idx >= 0) {
                newProviders[idx].name = name;
                if (newProviders[idx].type !== type) {
                    newProviders[idx].type = type;
                    newProviders[idx].models = [];
                }
            }
        } else {
            // Add new
            newProviders.push({
                id: generateId(),
                name: name,
                type: type,
                apiKey: "",
                apiUrl: "",
                models: []
            });
        }

        try {
            var saved = await saveConfig({ providers: newProviders }, CONFIG, CONFIG.configFileName);
            if (saved) {
                var updatedConfig = Object.assign({}, config, { providers: newProviders });
                dispatch({ type: "SET", key: "turingConfig", value: updatedConfig });
                var flatModels = deriveFlatModels(newProviders);
                dispatch({ type: "SET", key: "models", value: flatModels });
                setStatus({ message: editingId ? "服务商已更新" : "服务商已创建，请点击卡片配置 API 信息", type: "success" });
                setEditingId(null);
                setView("list");
            } else {
                setStatus({ message: "保存失败，请重试", type: "error" });
            }
        } catch (e) {
            console.error("[Settings] Save provider failed:", e);
            setStatus({ message: "保存失败: " + e.message, type: "error" });
        }
    }

    // === Delete Provider (navigate to confirmation) ===
    function handleDeleteProvider(providerId) {
        clearStatus();
        setDeletingId(providerId);
        setView("deleteConfirm");
    }

    // === Confirm Delete ===
    async function handleConfirmDelete() {
        var providerId = deletingId;
        if (!providerId) return;

        var prov = providers.find(function (p) { return p.id === providerId; });
        if (!prov) { console.warn("[Settings] Delete: provider not found"); return; }

        console.log("[Settings] Deleting provider:", prov.name, providerId);

        var currentKey = state.selectedModel;
        var currentParsed = parseModelKey(currentKey, providers);
        var currentBelongs = currentParsed.providerId === providerId;

        var newProviders = providers.filter(function (p) { return p.id !== providerId; });

        try {
            var saved = await saveConfig({ providers: newProviders }, CONFIG, CONFIG.configFileName);
            if (saved) {
                var config = state.turingConfig;
                var updatedConfig = Object.assign({}, config, { providers: newProviders });
                dispatch({ type: "SET", key: "turingConfig", value: updatedConfig });

                var flatModels = deriveFlatModels(newProviders);
                dispatch({ type: "SET", key: "models", value: flatModels });

                if (currentBelongs) {
                    var fallback = flatModels.length > 0
                        ? composeModelKey(flatModels[0].providerId, flatModels[0].id)
                        : CONFIG.selectedModel;
                    dispatch({ type: "SET", key: "selectedModel", value: fallback });
                    console.log("[Settings] Deleted provider had selected model, switched to:", fallback);
                }
                setStatus({ message: "服务商已删除", type: "success" });
                setDeletingId(null);
                setView("list");
            } else {
                setStatus({ message: "删除失败", type: "error" });
            }
        } catch (e) {
            console.error("[Settings] Delete provider failed:", e);
            setStatus({ message: "删除失败: " + e.message, type: "error" });
        }
    }

    function handleCancelDelete() {
        clearStatus();
        setDeletingId(null);
        setView("list");
    }

    // === Save Provider Config (Step 2) ===
    async function handleSaveProviderConfig(apiKey, apiUrl, selectedModels) {
        console.log("[Settings] handleSaveProviderConfig called, models:", selectedModels.length);
        var config = state.turingConfig;
        if (!config) { console.error("[Settings] No turingConfig!"); return; }

        var newProviders = config.providers.map(function (p) { return Object.assign({}, p); });
        var provIdx = newProviders.findIndex(function (p) { return p.id === configuringId; });
        if (provIdx < 0) {
            setStatus({ message: "服务商信息丢失", type: "error" });
            return;
        }

        newProviders[provIdx].apiKey = apiKey;
        newProviders[provIdx].apiUrl = apiUrl;
        newProviders[provIdx].models = selectedModels;

        try {
            var saved = await saveConfig({ providers: newProviders }, CONFIG, CONFIG.configFileName);
            if (saved) {
                var updatedConfig = Object.assign({}, config, { providers: newProviders });
                dispatch({ type: "SET", key: "turingConfig", value: updatedConfig });

                var flatModels = deriveFlatModels(newProviders);
                dispatch({ type: "SET", key: "models", value: flatModels });

                // Check if selected model still exists
                var currentKey = state.selectedModel;
                var currentParsed = parseModelKey(currentKey, newProviders);
                var stillExists = flatModels.some(function (m) {
                    return m.providerId === currentParsed.providerId && m.id === currentParsed.modelId;
                });
                if (!stillExists && flatModels.length > 0) {
                    var fallback = composeModelKey(flatModels[0].providerId, flatModels[0].id);
                    dispatch({ type: "SET", key: "selectedModel", value: fallback });
                    console.log("[Settings] Selected model not in new list, switched to:", fallback);
                }

                setStatus({ message: "服务商配置已保存（" + selectedModels.length + " 个模型）", type: "success" });
                setConfiguringId(null);
                setView("list");
            } else {
                setStatus({ message: "保存失败，请重试", type: "error" });
            }
        } catch (e) {
            console.error("[Settings] Save provider config failed:", e);
            setStatus({ message: "保存失败: " + e.message, type: "error" });
        }
    }

    // === Resolve current editing/configuring/deleting provider ===
    var editingProvider = editingId ? providers.find(function (p) { return p.id === editingId; }) : null;
    var configuringProvider = configuringId ? providers.find(function (p) { return p.id === configuringId; }) : null;
    var deletingProvider = deletingId ? providers.find(function (p) { return p.id === deletingId; }) : null;

    return (
        <div className="settings-page">
            <div className="settings-header">
                <span className="icon-btn" role="button" tabIndex="0" title="返回" onClick={handleCloseSettings}>
                    <Icon name="chevron-left" />
                </span>
                <span className="settings-title">API 服务商管理</span>
            </div>

            <div className="settings-body">
                {view === "list" && (
                    <ProviderList
                        providers={providers}
                        onAdd={handleAddProvider}
                        onEdit={handleEditProvider}
                        onConfig={handleConfigureProvider}
                        onDelete={handleDeleteProvider}
                    />
                )}

                {view === "form" && (
                    <ProviderForm
                        initial={editingProvider}
                        onSave={handleSaveProvider}
                        onCancel={handleCancelForm}
                    />
                )}

                {view === "config" && configuringProvider && (
                    <ProviderConfigPanel
                        provider={configuringProvider}
                        onSave={handleSaveProviderConfig}
                        onBack={handleBackToList}
                    />
                )}

                {view === "deleteConfirm" && deletingProvider && (
                    <div className="provider-form">
                        <div style={{ textAlign: "center", padding: "16px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", marginBottom: "16px" }}>
                            <p style={{ margin: "0 0 4px", fontSize: "var(--font-size-md)", color: "var(--color-text)" }}>
                                确定要删除服务商
                            </p>
                            <p style={{ margin: "0 0 16px", fontSize: "var(--font-size-md)", fontWeight: 600, color: "var(--color-danger)" }}>
                                "{deletingProvider.name}"
                            </p>
                            <p style={{ margin: "0", fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                                此操作不可撤销，关联的模型配置也将被删除。
                            </p>
                        </div>
                        <div style={{ display: "flex" }}>
                            <span
                                role="button"
                                tabIndex={0}
                                className="small-btn"
                                style={{ flex: 1, textAlign: "center" }}
                                onClick={handleCancelDelete}
                                onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCancelDelete(); } }}
                            >
                                取消
                            </span>
                            <span
                                role="button"
                                tabIndex={0}
                                className="generate-btn"
                                style={{ flex: 1, textAlign: "center", background: "var(--color-danger)", marginLeft: "var(--spacing-sm)", padding: "6px 10px", border: "1px solid transparent" }}
                                onClick={handleConfirmDelete}
                                onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleConfirmDelete(); } }}
                            >
                                确认删除
                            </span>
                        </div>
                    </div>
                )}

                {status.message && (
                    <div className={"settings-status" + (status.type ? " " + status.type : "")}>
                        {status.message}
                    </div>
                )}
            </div>
        </div>
    );
}
