import { useTuringState, useTuringDispatch } from "../context/TuringContext.jsx";
import { deriveFlatModels, composeModelKey } from "../config.js";

export default function ModelSelector() {
    const state = useTuringState();
    const dispatch = useTuringDispatch();

    var config = state.turingConfig || { providers: [] };
    var models = deriveFlatModels(config.providers);

    function handleChange(e) {
        var value = e.target.value;
        if (value && value !== "loading") {
            dispatch({ type: "SET", key: "selectedModel", value });
        }
    }

    return (
        <div className="section">
            <label className="section-label">模型</label>
            <div className="model-picker">
                <sp-picker
                    id="model-picker"
                    size="m"
                    quiet
                    style={{width: "100%", display: "block"}}
                    value={state.selectedModel}
                    onChange={handleChange}
                >
                    <sp-menu slot="options" id="model-menu">
                        {models.map(function (model) {
                            var key = composeModelKey(model.providerId, model.id);
                            var selected = key === state.selectedModel;
                            return (
                                <sp-menu-item key={key} value={key} selected={selected ? "" : undefined}>
                                    {model.name + " · " + model.providerName}
                                </sp-menu-item>
                            );
                        })}
                    </sp-menu>
                </sp-picker>
            </div>
        </div>
    );
}
