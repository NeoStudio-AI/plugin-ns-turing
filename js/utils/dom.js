/* ============================================================
   NS Turing - Domain Helpers
   ============================================================ */

/**
 * Create an element with attributes and children.
 */
function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
        if (key === "className") {
            el.className = val;
        } else if (key === "textContent") {
            el.textContent = val;
        } else if (key.startsWith("on")) {
            el.addEventListener(key.slice(2).toLowerCase(), val);
        } else {
            el.setAttribute(key, val);
        }
    }
    for (const child of children) {
        if (typeof child === "string") {
            el.appendChild(document.createTextNode(child));
        } else if (child) {
            el.appendChild(child);
        }
    }
    return el;
}

/**
 * Simple debounce utility.
 */
function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Detect Photoshop UI theme (dark/light) via themeColorValues.
 * Adds "theme-light" class to <body> when PS is in light mode.
 * Must be called outside executeAsModal (themeColorValues is synchronous).
 */
function initTheme() {
    try {
        if (typeof require !== "function") return;
        var ps = require("photoshop");
        if (!ps || !ps.app) return;

        var themeColors = ps.app.themeColorValues;
        if (!themeColors) return;

        // Try known background-color keys in priority order
        var keys = ['appBackground', 'panelBackground', 'controlBackground'];
        var r = 0, g = 0, b = 0, found = false;

        for (var i = 0; i < keys.length; i++) {
            var color = themeColors[keys[i]];
            if (color && typeof color === "object") {
                r = color.red   || color.r || 0;
                g = color.green || color.g || 0;
                b = color.blue  || color.b || 0;
                found = true;
                break;
            }
        }

        if (!found) return;

        // Normalize: 0–1 range → 0–255
        if (r <= 1 && g <= 1 && b <= 1) {
            r *= 255; g *= 255; b *= 255;
        }

        // sRGB perceived luminance (threshold 128)
        var lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (lum > 128) {
            document.body.classList.add("theme-light");
            console.log("[Theme] Light theme (lum=" + lum.toFixed(0) + ")");
        } else {
            document.body.classList.remove("theme-light");
            console.log("[Theme] Dark theme (lum=" + lum.toFixed(0) + ")");
        }
    } catch (e) {
        // Not in UXP/Photoshop environment — ignore
        console.log("[Theme] Not in PS environment, using default dark theme");
    }
}

/**
 * Icon metadata: dark + light file paths and intrinsic size.
 * Dark icons (deep colors) used on light theme bg.
 * Light icons (#ffffff) used on dark theme bg.
 */
var ICON_META = {
    "panel-icon":   { dark: "icons/panel-dark.png",          light: "icons/panel-light.png",          w: 20, h: 20 },
    "settings":     { dark: "icons/settings-dark.svg",      light: "icons/settings-light.svg",      w: 18, h: 18 },
    "chevron-down": { dark: "icons/chevron-down-dark.svg",   light: "icons/chevron-down-light.svg",   w: 10, h: 10 },
    "chevron-left": { dark: "icons/chevron-left-dark.svg",   light: "icons/chevron-left-light.svg",   w: 18, h: 18 },
    "close":        { dark: "icons/close-dark.svg",          light: "icons/close-light.svg",          w: 18, h: 18 },
    "eye":          { dark: "icons/eye-dark.svg",            light: "icons/eye-light.svg",            w: 18, h: 18 },
    "eye-off":      { dark: "icons/eye-off-dark.svg",        light: "icons/eye-off-light.svg",        w: 18, h: 18 },
    "check":        { dark: "icons/check-dark.svg",          light: "icons/check-light.svg",          w: 12, h: 12 },
    "x-circle":     { dark: "icons/x-circle-dark.svg",       light: "icons/x-circle-light.svg",       w: 12, h: 12 },
    "edit":         { dark: "icons/edit-dark.svg",           light: "icons/edit-light.svg",           w: 14, h: 14 },
    "trash":        { dark: "icons/trash-dark.svg",          light: "icons/trash-light.svg",          w: 14, h: 14 },
};

/**
 * Resolve icon src path for current theme.
 * Dark theme bg → need light (white) icons. Light theme bg → need dark icons.
 */
function getIconSrc(meta) {
    var isLightTheme = document.body.classList.contains("theme-light");
    return isLightTheme ? meta.dark : meta.light;
}

/**
 * Return an <img> tag HTML string for a named icon.
 * Always starts with the correct theme version via getIconSrc().
 * @param {string} name - icon name
 * @param {string} [extraClass] - additional CSS class
 * @returns {string} HTML string
 */
function iconSpan(name, extraClass) {
    var meta = ICON_META[name];
    if (!meta) return "";
    var cls = extraClass || "";
    var src = getIconSrc(meta);
    return '<img src="' + src + '" width="' + meta.w + '" height="' + meta.h + '" alt="" class="' + cls + '" data-icon="' + name + '">';
}

/**
 * Update all icon <img data-icon="..."> elements to match the current theme.
 * Called after initTheme() detects theme and sets .theme-light class on body.
 */
function updateIconSrcs() {
    var imgs = document.querySelectorAll("img[data-icon]");
    for (var i = 0; i < imgs.length; i++) {
        var el = imgs[i];
        var name = el.getAttribute("data-icon");
        var meta = ICON_META[name];
        if (!meta) continue;
        el.src = getIconSrc(meta);
    }
}

// Expose globally for non-module script loading (UXP compatibility)
window.createEl = createEl;
window.debounce = debounce;
window.initTheme = initTheme;
window.iconSpan = iconSpan;
window.updateIconSrcs = updateIconSrcs;
