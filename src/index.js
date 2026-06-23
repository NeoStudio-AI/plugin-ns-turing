import React from "react";
import { createRoot } from "react-dom/client";
// UXP wrappers MUST be imported first to register sp-* custom elements
import "@swc-uxp-wrappers/utils";
import "@swc-uxp-wrappers/checkbox";
import { Theme } from "@swc-react/theme";
import { TuringProvider } from "./context/TuringContext.jsx";
import App from "./App.jsx";

// ── Theme Detection ────────────────────────────────────────────
// Default to dark theme (most PS users). Detection via body
// background luminance will correct this for light-theme users.
document.documentElement.setAttribute("data-theme", "dark");

function detectTheme() {
    try {
        var bg = getComputedStyle(document.body).backgroundColor;
        // If body bg is transparent, try the UXP host variable
        if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
            bg = getComputedStyle(document.body).getPropertyValue("--uxp-host-background-color").trim();
        }
        if (!bg) return;
        var m = bg.match(/[\d.]+/g);
        if (!m || m.length < 3) return;
        var r = parseFloat(m[0]), g = parseFloat(m[1]), b = parseFloat(m[2]);
        // Relative luminance (sRGB)
        var lum = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
        document.documentElement.setAttribute("data-theme", lum > 0.5 ? "light" : "dark");
    } catch (_) { /* ignore */ }
}

// Try immediately; retry after UXP injects its host styles
detectTheme();
setTimeout(detectTheme, 80);
setTimeout(detectTheme, 400);

console.log("[NS Turing] Init: finding root...");
var rootEl = document.getElementById("root");
console.log("[NS Turing] Root element:", rootEl);

if (!rootEl) {
    console.error("[NS Turing] FATAL: #root not found!");
} else {
    try {
        var root = createRoot(rootEl);
        console.log("[NS Turing] Rendering...");
        root.render(
            <Theme theme="spectrum" scale="medium" color="light">
                <TuringProvider>
                    <App />
                </TuringProvider>
            </Theme>
        );
        console.log("[NS Turing] Render called.");
    } catch (e) {
        console.error("[NS Turing] Render error:", e);
        rootEl.innerHTML = '<div style="padding:12px;color:red;font-family:sans-serif">Init Error: ' + e.message + '</div>';
    }
}
