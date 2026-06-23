import { useCallback, useEffect } from "react";
import { useTuringState, useTuringDispatch } from "../context/TuringContext.jsx";
import { runGenerate } from "../utils/generate.js";

export default function GenerateButton() {
    const state = useTuringState();
    const dispatch = useTuringDispatch();

    const handleClick = useCallback(async function () {
        if (state.generating) return;

        dispatch({ type: "SET", key: "generating", value: true });

        await runGenerate({
            state: state,
            onStatus: function (msg, type) {
                dispatch({ type: "SET_MULTI", payload: { status: msg, statusType: type || "" } });
            },
            onProgress: function (pct) {
                dispatch({ type: "SET", key: "progress", value: pct });
            },
            onComplete: function (images, placed) {
                dispatch({ type: "SET_MULTI", payload: {
                    generatedImages: images,
                    status: "成功生成 " + placed + " 张图片，已置入为智能对象图层",
                    statusType: "success",
                    generating: false
                }});
                setTimeout(function () {
                    dispatch({ type: "SET_MULTI", payload: { progress: 0 } });
                }, 2000);
            },
            onError: function (msg) {
                dispatch({ type: "SET_MULTI", payload: {
                    status: msg,
                    statusType: "error",
                    generating: false
                }});
                setTimeout(function () {
                    dispatch({ type: "SET_MULTI", payload: { progress: 0 } });
                }, 3000);
            }
        });
    }, [state, dispatch]);

    // Ctrl+Enter keyboard shortcut
    useEffect(function () {
        function onKeyDown(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleClick();
            }
        }
        document.addEventListener("keydown", onKeyDown);
        return function () { document.removeEventListener("keydown", onKeyDown); };
    }, [handleClick]);

    return (
        <span
            role="button"
            tabIndex={0}
            className={"generate-btn" + (state.generating ? " disabled" : "")}
            onClick={state.generating ? undefined : handleClick}
            onKeyDown={function (e) { if (!state.generating && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleClick(); } }}
        >
            {state.generating ? "生成中..." : "生成图片"}
        </span>
    );
}
