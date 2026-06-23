import React, { createContext, useContext, useReducer } from "react";

const initialState = {
    prompt: "",
    canvasAsRef: false,
    layersAsRef: false,
    selectedLayerIds: [],
    availableLayers: [],
    uploadedRefs: [],
    selectedModel: "default-openai|gpt-image-2",
    models: [],
    generating: false,
    progress: 0,
    status: "",
    statusType: "",
    generatedImages: [],
    abortController: null,
    showSettings: false,
    turingConfig: null,
};

function turingReducer(state, action) {
    switch (action.type) {
        case "SET":
            return { ...state, [action.key]: action.value };
        case "SET_MULTI":
            return { ...state, ...action.payload };
        case "REPLACE_ALL":
            return { ...state, ...action.payload };
        default:
            return state;
    }
}

const TuringStateContext = createContext(null);
const TuringDispatchContext = createContext(null);

export function TuringProvider({ children }) {
    const [state, dispatch] = useReducer(turingReducer, initialState);
    return (
        <TuringStateContext.Provider value={state}>
            <TuringDispatchContext.Provider value={dispatch}>
                {children}
            </TuringDispatchContext.Provider>
        </TuringStateContext.Provider>
    );
}

export function useTuringState() {
    return useContext(TuringStateContext);
}

export function useTuringDispatch() {
    return useContext(TuringDispatchContext);
}
