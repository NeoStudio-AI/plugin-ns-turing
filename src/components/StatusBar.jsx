import { useTuringState } from "../context/TuringContext.jsx";

export default function StatusBar() {
    const state = useTuringState();
    if (!state.status) return null;
    var className = "status-bar";
    if (state.statusType === "error") className += " error";
    else if (state.statusType === "success") className += " success";
    return <div className={className}>{state.status}</div>;
}
