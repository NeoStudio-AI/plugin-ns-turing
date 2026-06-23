import { PROVIDER_TYPE_INFO } from "../../config.js";
import { Icon } from "../../utils/icons.jsx";

/**
 * Provider card list view.
 * Props: providers, onConfig, onEdit, onDelete, onAdd
 */
export default function ProviderList({ providers, onConfig, onEdit, onDelete, onAdd }) {
    var list = providers || [];

    return (
        <div className="settings-section">
            {list.length === 0 ? (
                <div className="provider-empty">暂无服务商，点击下方按钮添加</div>
            ) : (
                <div className="provider-list">
                    {list.map(function (prov) {
                        var typeInfo = PROVIDER_TYPE_INFO[prov.type] || {};
                        var typeLabel = typeInfo.label || prov.type;
                        var hasKey = prov.apiKey && prov.apiKey.length > 0;
                        var modelCount = (prov.models || []).filter(function (m) { return m.enabled !== false; }).length;

                        return (
                            <div key={prov.id} className="provider-card" onClick={function () { onConfig(prov.id); }}>
                                <div className="provider-card-info">
                                    <div className="provider-card-name">{prov.name}</div>
                                    <div className="provider-card-meta">
                                        <span className="badge">{typeLabel}</span>
                                        <span className={"provider-key-status" + (hasKey ? " configured" : "")}>
                                            <Icon name={hasKey ? "check" : "x-circle"} width={12} height={12} />
                                            {" "}{hasKey ? "已配置密钥" : "未配置密钥"}
                                        </span>
                                        <span className="provider-model-count">{modelCount} 个模型</span>
                                    </div>
                                </div>
                                <div className="provider-card-actions">
                                    <span role="button" tabIndex="0" className="provider-action-btn" title="编辑名称/类型" onClick={function (e) { e.stopPropagation(); onEdit(prov.id); }} onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onEdit(prov.id); } }}>
                                        <Icon name="edit" />
                                    </span>
                                    <span role="button" tabIndex="0" className="provider-action-btn danger" title="删除" onClick={function (e) { e.stopPropagation(); onDelete(prov.id); }} onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onDelete(prov.id); } }}>
                                        <Icon name="trash" />
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <span role="button" tabIndex={0} className="small-btn provider-add-btn" onClick={onAdd} onKeyDown={function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAdd(); } }}>+ 添加服务商</span>
        </div>
    );
}
