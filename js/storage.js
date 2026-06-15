/* ============================================================
   NS Turing - Storage (UXP localFileSystem persistence)
   ============================================================ */

const storage = (() => {
    /**
     * Get the plugin's data folder (persistent, unique to this plugin).
     * Returns null if localFileSystem is not available.
     */
    async function getDataFolder() {
        try {
            // UXP storage API
            if (typeof require === "function") {
                const uxp = require("uxp");
                if (uxp && uxp.storage && uxp.storage.localFileSystem) {
                    return await uxp.storage.localFileSystem.getDataFolder();
                }
            }
            return null;
        } catch (e) {
            console.error("[Storage] Cannot access data folder:", e);
            return null;
        }
    }

    /**
     * Load configuration from persisted file, merged with defaults.
     */
    async function loadConfig() {
        try {
            const folder = await getDataFolder();
            if (!folder) return { ...window.CONFIG };

            const entries = await folder.getEntries();
            const configFile = entries.find(e => e.name === window.CONFIG.configFileName);

            if (configFile) {
                // UXP read() returns Uint8Array (not ArrayBuffer); handle safely
                const raw = await configFile.read();
                if (!raw || raw.byteLength === 0) {
                    console.warn("[Storage] Config file empty, using defaults");
                    return { ...window.CONFIG };
                }
                // Extract real ArrayBuffer (UXP instanceof is unreliable!)
                var buf;
                if (raw.buffer && typeof raw.buffer.byteLength === "number") {
                    buf = raw.buffer;
                } else if (typeof raw.slice === "function") {
                    buf = raw.slice(0, raw.byteLength);
                } else {
                    buf = raw;
                }
                const bytes = new Uint8Array(buf);
                var text = "";
                for (var i = 0; i < bytes.length; i++) {
                    text += String.fromCharCode(bytes[i]);
                }
                if (!text || text.trim().length === 0) {
                    console.warn("[Storage] Config file has no content, using defaults");
                    return { ...window.CONFIG };
                }
                const stored = JSON.parse(text);
                return deepMerge({ ...window.CONFIG }, stored);
            }
        } catch (e) {
            console.warn("[Storage] Failed to load config, using defaults:", e.message);
        }
        return { ...window.CONFIG };
    }

    /**
     * Save configuration (partial or full) to persisted file.
     */
    async function saveConfig(configPartial) {
        try {
            const folder = await getDataFolder();
            if (!folder) return false;

            // Load existing, merge with new partial
            const existing = await loadConfig();
            const merged = deepMerge(existing, configPartial);

            // Write — always use createFile with overwrite for fresh handle
            var configFile = await folder.createFile(window.CONFIG.configFileName, { overwrite: true });

            const text = JSON.stringify(merged, null, 2);
            await configFile.write(text, { append: false });

            return true;
        } catch (e) {
            console.error("[Storage] Failed to save config:", e);
            return false;
        }
    }

    /**
     * Deep merge two objects. b overrides a for same keys.
     */
    function deepMerge(a, b) {
        if (typeof b !== "object" || b === null) return b;
        if (Array.isArray(b)) return [...b];

        const result = { ...a };
        for (const key of Object.keys(b)) {
            if (typeof b[key] === "object" && b[key] !== null && !Array.isArray(b[key]) &&
                typeof a[key] === "object" && a[key] !== null && !Array.isArray(a[key])) {
                result[key] = deepMerge(a[key], b[key]);
            } else {
                result[key] = b[key];
            }
        }
        return result;
    }

    return { loadConfig, saveConfig };
})();

// Expose globally for non-module script loading (UXP compatibility)
window.storage = storage;
