import { useTuringState } from "../context/TuringContext.jsx";

export default function ProgressBar() {
    const state = useTuringState();
    if (!state.generating && state.progress === 0) return null;
    return (
        <div className="progress-container">
            <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: state.progress + "%" }}></div>
            </div>
            <span className="progress-text">{state.progress}%</span>
        </div>
    );
}
