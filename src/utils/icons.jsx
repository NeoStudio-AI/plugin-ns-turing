/* ============================================================
   NS Turing - Theme-aware Icon Component
   Dark theme bg → light (white) icons. Light theme bg → dark icons.
   ============================================================ */

var ICON_META = {
    "panel-icon":   { dark: "icons/panel-dark.png",          light: "icons/panel-light.png",          w: 20, h: 20 },
    "settings":     { dark: "icons/settings-dark.svg",       light: "icons/settings-light.svg",       w: 18, h: 18 },
    "chevron-down": { dark: "icons/chevron-down-dark.svg",   light: "icons/chevron-down-light.svg",   w: 10, h: 10 },
    "chevron-left": { dark: "icons/chevron-left-dark.svg",   light: "icons/chevron-left-light.svg",   w: 18, h: 18 },
    "close":        { dark: "icons/close-dark.svg",          light: "icons/close-light.svg",          w: 18, h: 18 },
    "eye":          { dark: "icons/eye-dark.svg",            light: "icons/eye-light.svg",            w: 18, h: 18 },
    "eye-off":      { dark: "icons/eye-off-dark.svg",        light: "icons/eye-off-light.svg",        w: 18, h: 18 },
    "check":        { dark: "icons/check-dark.svg",          light: "icons/check-light.svg",          w: 12, h: 12 },
    "x-circle":     { dark: "icons/x-circle-dark.svg",       light: "icons/x-circle-light.svg",       w: 12, h: 12 },
    "edit":         { dark: "icons/edit-dark.svg",           light: "icons/edit-light.svg",           w: 16, h: 16 },
    "trash":        { dark: "icons/trash-dark.svg",          light: "icons/trash-light.svg",          w: 16, h: 16 },
};

/**
 * Resolve the correct icon src for the current theme.
 * Reads data-theme attr on <html> (set by index.js).
 * Falls back to dark theme when not yet detected.
 * Dark theme → light icons. Light theme → dark icons.
 */
function getIconSrc(name) {
    var meta = ICON_META[name];
    if (!meta) return "";
    var theme = document.documentElement.getAttribute("data-theme");
    // If theme not yet detected, default to dark (light icons)
    return theme === "light" ? meta.dark : meta.light;
}

/**
 * Theme-aware <img> icon component.
 * Props: name (icon key), className?, style?, width?, height?
 * Defaults to ICON_META intrinsic size.
 */
export function Icon({ name, className, style, width, height }) {
    var meta = ICON_META[name];
    if (!meta) return null;
    var src = getIconSrc(name);
    var w = width || meta.w;
    var h = height || meta.h;

    return (
        <img
            src={src}
            width={w}
            height={h}
            alt=""
            className={className || ""}
            style={style}
            data-icon={name}
        />
    );
}

export { ICON_META, getIconSrc };
