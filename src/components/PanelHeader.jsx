import { useTuringDispatch } from "../context/TuringContext.jsx";
import { Icon } from "../utils/icons.jsx";

export default function PanelHeader() {
    var dispatch = useTuringDispatch();

    function handleSettingsClick() {
        dispatch({ type: "SET", key: "showSettings", value: true });
    }

    return (
        <div id="panel-header">
            <span className="panel-title">
                <Icon name="panel-icon" className="panel-title-icon" />
                Turing
            </span>
            <div className="header-right">
                <span className="icon-btn" role="button" tabIndex="0" title="设置" onClick={handleSettingsClick}>
                    <Icon name="settings" />
                </span>
            </div>
        </div>
    );
}
