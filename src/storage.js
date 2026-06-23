/* ============================================================
   NS Turing - Storage (UXP localFileSystem persistence)
   ============================================================ */

/**
 * Get the plugin's data folder.
 * Returns null if localFileSystem is not available.
 */
async function getDataFolder() {
    try {
        if (typeof require !== "function") return null;
        const uxp = require("uxp");
        if (!uxp || !uxp.storage || !uxp.storage.localFileSystem) return null;
        return await uxp.storage.localFileSystem.getDataFolder();
    } catch (e) {
        console.error("[Storage] Cannot access data folder:", e.message);
        return null;
    }
}

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

/**
 * Load configuration from persisted file, merged with defaults.
 * File.read() in UXP returns a UTF-8 string by default (NOT ArrayBuffer).
 * We handle both string and binary return types.
 */
export async function loadConfig(defaultConfig, configFileName) {
    try {
        const folder = await getDataFolder();
        if (!folder) return { ...defaultConfig };

        const entries = await folder.getEntries();
        const configFile = entries.find(e => e.name === configFileName);
        if (!configFile) {
            console.log("[Storage] No saved config, using defaults");
            return { ...defaultConfig };
        }

        const raw = await configFile.read();
        var text;
        if (typeof raw === "string") {
            text = raw;
        } else if (raw instanceof ArrayBuffer || (raw && typeof raw.byteLength === "number")) {
            var buf = raw.buffer ? raw.buffer : raw;
            const bytes = new Uint8Array(buf);
            text = "";
            for (var i = 0; i < bytes.length; i++) { text += String.fromCharCode(bytes[i]); }
        }

        if (!text || text.trim().length === 0) return { ...defaultConfig };
        const stored = JSON.parse(text);
        console.log("[Storage] Config loaded, keys:", Object.keys(stored).join(", "));
        return deepMerge({ ...defaultConfig }, stored);
    } catch (e) {
        console.warn("[Storage] Failed to load config:", e.message);
    }
    return { ...defaultConfig };
}

/**
 * Save configuration to persisted file.
 * Uses official UXP API: createFile({overwrite:true}) + write()
 */
export async function saveConfig(configPartial, defaultConfig, configFileName) {
    try {
        const folder = await getDataFolder();
        if (!folder) { console.error("[Storage] No data folder!"); return false; }

        const existing = await loadConfig(defaultConfig, configFileName);
        const merged = deepMerge(existing, configPartial);
        const text = JSON.stringify(merged, null, 2);

        const configFile = await folder.createFile(configFileName, { overwrite: true });
        const written = await configFile.write(text, { append: false });

        // Verify: File.read() returns string by default in UXP
        const verifyRaw = await configFile.read();
        if (typeof verifyRaw === "string" && verifyRaw.trim().length > 0) {
            console.log("[Storage] Config saved,", written, "bytes");
            return true;
        }
        if (verifyRaw && verifyRaw.byteLength > 0) {
            console.log("[Storage] Config saved,", verifyRaw.byteLength, "bytes (binary)");
            return true;
        }
        console.warn("[Storage] Save verify failed: file appears empty");
        return false;
    } catch (e) {
        console.error("[Storage] Failed to save config:", e.message);
        return false;
    }
}
