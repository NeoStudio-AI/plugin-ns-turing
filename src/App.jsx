import { useEffect } from "react";
import { useTuringState, useTuringDispatch } from "./context/TuringContext.jsx";
import { CONFIG, deriveFlatModels, migrateConfig } from "./config.js";
import { loadConfig } from "./storage.js";
import PanelHeader from "./components/PanelHeader.jsx";
import PromptSection from "./components/PromptSection.jsx";
import ReferenceSection from "./components/ReferenceSection.jsx";
import ModelSelector from "./components/ModelSelector.jsx";
import GenerateButton from "./components/GenerateButton.jsx";
import ProgressBar from "./components/ProgressBar.jsx";
import StatusBar from "./components/StatusBar.jsx";
import SettingsPage from "./components/settings/SettingsPage.jsx";
import "./styles.css";

export default function App() {
    const state = useTuringState();
    const dispatch = useTuringDispatch();
    const booted = state.turingConfig !== null;

    // Bootstrap on mount
    useEffect(() => {
        if (booted) return;
        async function bootstrap() {
            console.log("[NS Turing] Bootstrapping...");
            var savedConfig = await loadConfig(CONFIG, CONFIG.configFileName);
            savedConfig = migrateConfig(savedConfig);

            // Patch defaults for dev convenience
            if (savedConfig.providers && CONFIG.providers) {
                for (var i = 0; i < savedConfig.providers.length; i++) {
                    var sp = savedConfig.providers[i];
                    for (var j = 0; j < CONFIG.providers.length; j++) {
                        var cp = CONFIG.providers[j];
                        if (sp.id === cp.id && sp.type === cp.type) {
                            if (!sp.apiKey && cp.apiKey) sp.apiKey = cp.apiKey;
                            if (!sp.apiUrl && cp.apiUrl) sp.apiUrl = cp.apiUrl;
                            if ((!sp.models || sp.models.length === 0) && cp.models && cp.models.length > 0) {
                                sp.models = cp.models.map(function (m) { return { id: m.id, name: m.name, enabled: m.enabled }; });
                            }
                            break;
                        }
                    }
                }
            }

            var flatModels = deriveFlatModels(savedConfig.providers);
            dispatch({ type: "SET_MULTI", payload: {
                models: flatModels,
                selectedModel: savedConfig.selectedModel || CONFIG.selectedModel,
                status: "",
                turingConfig: savedConfig,
            }});
            console.log("[NS Turing] Bootstrap complete.");
        }
        bootstrap();
    }, [booted, dispatch]);

    if (!booted) return <div style={{ padding: "12px", color: "#e0e0e0" }}>加载中...</div>;

    if (state.showSettings) return <SettingsPage />;

    return (
        <div id="app">
            <PanelHeader />
            <PromptSection />
            <ReferenceSection />
            <ModelSelector />
            <div className="action-area">
                <ProgressBar />
                <StatusBar />
                <GenerateButton />
            </div>
        </div>
    );
}
