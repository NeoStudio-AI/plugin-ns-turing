/* ============================================================
   NS Turing - Main Entry Point
   ============================================================ */

/**
 * Bootstrap the plugin when the panel loads.
 */
async function bootstrap() {
    console.log("[NS Turing] Bootstrapping...");

    // Load persisted configuration
    var savedConfig = await window.storage.loadConfig();

    // Migrate old config format (models embedded in providers)
    savedConfig = window.migrateConfig(savedConfig);

    // Patch: apply hardcoded defaults for providers with empty apiKey/apiUrl/models
    // so developers don't need to re-enter credentials during testing.
    if (savedConfig.providers && window.CONFIG.providers) {
        for (var i = 0; i < savedConfig.providers.length; i++) {
            var sp = savedConfig.providers[i];
            for (var j = 0; j < window.CONFIG.providers.length; j++) {
                var cp = window.CONFIG.providers[j];
                if (sp.id === cp.id && sp.type === cp.type) {
                    if (!sp.apiKey && cp.apiKey) sp.apiKey = cp.apiKey;
                    if (!sp.apiUrl && cp.apiUrl) sp.apiUrl = cp.apiUrl;
                    // Patch models if provider has none
                    if ((!sp.models || sp.models.length === 0) && cp.models && cp.models.length > 0) {
                        sp.models = cp.models.map(function (m) { return { id: m.id, name: m.name, enabled: m.enabled }; });
                    }
                    break;
                }
            }
        }
    }

    // Derive flat model list from providers
    var flatModels = window.deriveFlatModels(savedConfig.providers);

    // Initialize state with saved values
    window.state.set("models", flatModels);
    window.state.set("selectedModel", savedConfig.selectedModel || window.CONFIG.selectedModel);
    window.state.set("status", "就绪");

    // Store full config reference for API layer
    window.__turingConfig = savedConfig;

    // Inject DOM event listeners
    window.initPanel();
    window.initApp();

    console.log("[NS Turing] Bootstrap complete. Model:", window.state.get("selectedModel"), "|", flatModels.length, "models available");
}

// UXP plugins use the 'load' event
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
} else {
    bootstrap();
}
