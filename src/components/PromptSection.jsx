import { useTuringState, useTuringDispatch } from "../context/TuringContext.jsx";
import { CONFIG } from "../config.js";

function countPromptUnits(text) {
    if (!text || !text.trim()) return 0;
    var cjkRe = /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g;
    var cjkMatch = text.match(cjkRe);
    var cjkCount = cjkMatch ? cjkMatch.length : 0;
    var englishPart = text.replace(cjkRe, " ");
    var words = englishPart.split(/\s+/).filter(function (w) {
        return /[a-zA-Z0-9]/.test(w);
    });
    return cjkCount + words.length;
}

export default function PromptSection() {
    const state = useTuringState();
    const dispatch = useTuringDispatch();
    const max = CONFIG.maxPromptWords;
    const count = countPromptUnits(state.prompt);
    var ratio = count / max;
    var counterClass = "prompt-counter";
    if (ratio >= 1) counterClass += " over";
    else if (ratio >= 0.85) counterClass += " warn";

    function handleInput(e) {
        dispatch({ type: "SET", key: "prompt", value: e.target.value });
    }

    return (
        <div className="section">
            <label className="section-label">提示词 (Prompt)</label>
            <sp-textarea
                className="prompt-textarea"
                placeholder="描述你想要生成的图片内容..."
                rows="5"
                style={{ width: "100%" }}
                value={state.prompt}
                onInput={handleInput}
            />
            <span className={counterClass}>{count} / {max}</span>
        </div>
    );
}
