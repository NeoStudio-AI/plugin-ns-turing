import { useState, useRef, useCallback } from "react";
import { PROVIDER_TYPE_INFO } from "../../config.js";
import { Icon } from "../../utils/icons.jsx";

var PROVIDER_TYPES = [
    { value: "openai", label: "OpenAI" },
    { value: "gemini", label: "Google Gemini" },
];

/**
 * Step 1: Add or Edit provider (name + type only).
 * Props: initial (provider or null), onSave(name, type), onCancel
 */
export default function ProviderForm({ initial, onSave, onCancel }) {
    var [name, setName] = useState(initial ? initial.name : "");
    var [type, setType] = useState(initial ? initial.type : "openai");
    var [error, setError] = useState("");
    var [saving, setSaving] = useState(false);

    var isEdit = !!initial;
    var typeInfo = PROVIDER_TYPE_INFO[type] || {};

    function handleSave() {
        var trimmed = name.trim();
        if (!trimmed) {
            setError("请输入服务商名称");
            return;
        }
        setError("");
        setSaving(true);
        onSave(trimmed, type);
    }

    // Handle Enter key in inputs
    function handleKeyDown(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSave();
        }
    }

    return (
        <div className="provider-form">
            <div className="provider-form-header">
                <span className="settings-section-title">{isEdit ? "编辑服务商" : "添加服务商"}</span>
                <span className="icon-btn" role="button" tabIndex="0" onClick={onCancel} title="取消">
                    <Icon name="close" />
                </span>
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="input-provider-name">服务商名称</label>
                <sp-textfield
                    id="input-provider-name"
                    size="m"
                    quiet
                    placeholder="例如：My OpenAI、公司内部代理..."
                    value={name}
                    onInput={function (e) { setName(e.target.value); }}
                    onKeyDown={handleKeyDown}
                    autofocus
                />
            </div>

            <div className="form-group">
                <label className="form-label">接口类型</label>
                <div className="model-picker">
                    <sp-picker
                        id="provider-type-picker"
                        size="m"
                        quiet
                        style={{ width: "100%", display: "block" }}
                        value={type}
                        onchange={function (e) { setType(e.target.value); }}
                    >
                        <sp-menu slot="options">
                            {PROVIDER_TYPES.map(function (opt) {
                                return (
                                    <sp-menu-item key={opt.value} value={opt.value} selected={opt.value === type ? "" : undefined}>
                                        {opt.label}
                                    </sp-menu-item>
                                );
                            })}
                        </sp-menu>
                    </sp-picker>
                </div>
            </div>

            {/* Endpoint Info */}
            <div className="provider-endpoint-info">
                <div className="endpoint-info-row">
                    <span className="endpoint-label">文生图接口：</span>
                    <a className="endpoint-link" target="_blank" href={typeInfo.docs ? typeInfo.docs.textToImage : "#"}>查看文档</a>
                </div>
                <code className="endpoint-code">{typeInfo.endpoints ? typeInfo.endpoints.textToImage : ""}</code>
                <div className="endpoint-info-row">
                    <span className="endpoint-label">图生图接口：</span>
                    <a className="endpoint-link" target="_blank" href={typeInfo.docs ? typeInfo.docs.imageToImage : "#"}>查看文档</a>
                </div>
                <code className="endpoint-code">{typeInfo.endpoints ? typeInfo.endpoints.imageToImage : ""}</code>
            </div>

            {error && <div className="settings-status error">{error}</div>}

            <span
                role="button"
                tabIndex={0}
                className={"generate-btn" + (saving ? " disabled" : "")}
                onClick={saving ? undefined : handleSave}
                onKeyDown={function (e) { if (!saving && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleSave(); } }}
            >
                {saving ? "保存中..." : (isEdit ? "保存修改" : "确认并创建服务商")}
            </span>
        </div>
    );
}
