/* ============================================================
   NS Turing - Reactive State Store
   Simple observable pattern: subscribe to changes via callback.
   ============================================================ */

class StateStore {
    constructor(initialState = {}) {
        this._state = { ...initialState };
        this._listeners = {};
    }

    /**
     * Get a state value by key.
     */
    get(key) {
        return this._state[key];
    }

    /**
     * Set a state value and notify listeners.
     */
    set(key, value) {
        const oldValue = this._state[key];
        this._state[key] = value;

        if (this._listeners[key]) {
            this._listeners[key].forEach(cb => {
                try {
                    cb(value, oldValue);
                } catch (e) {
                    console.error(`[State] Listener error for "${key}":`, e);
                }
            });
        }
    }

    /**
     * Subscribe to changes on a specific key.
     * Returns unsubscribe function.
     */
    on(key, callback) {
        if (!this._listeners[key]) {
            this._listeners[key] = [];
        }
        this._listeners[key].push(callback);

        return () => {
            this._listeners[key] = this._listeners[key].filter(cb => cb !== callback);
        };
    }

    /**
     * Get all state as plain object.
     */
    getAll() {
        return { ...this._state };
    }

    /**
     * Replace all state at once (e.g. after loading from storage).
     */
    replaceAll(newState) {
        const keys = new Set([...Object.keys(this._state), ...Object.keys(newState)]);
        for (const key of keys) {
            this.set(key, newState[key] !== undefined ? newState[key] : null);
        }
    }
}

// Singleton instance with initial state
const initialState = {
    // Prompt
    prompt: "",

    // Canvas reference
    canvasAsRef: false,

    // Layer references
    layersAsRef: false,
    selectedLayerIds: [],
    availableLayers: [],

    // Uploaded reference images
    uploadedRefs: [],       // [{ id, label, dataUrl, source: "upload" }]

    // Model selection (composite key: "providerId|modelId")
    selectedModel: "default-openai|gpt-image-2",
    models: [],

    // Generation state
    generating: false,
    progress: 0,

    // Status message
    status: "",
    statusType: "",         // "", "error", "success"

    // Results
    generatedImages: [],

    // Abort controller for cancel
    abortController: null
};

const state = new StateStore(initialState);

// Expose globally for non-module script loading (UXP compatibility)
window.state = state;
