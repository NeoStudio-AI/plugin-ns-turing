// Generate visible UXP plugin icons - bold geometric design
const sharp = require("sharp");
const path = require("path");
const ICONS_DIR = path.join(__dirname, "..", "icons");

// A bold circle + "NS" icon that's clearly visible even at 23x23
const iconSvg = (size, fgColor) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="${fgColor}"/>
  <text x="${size/2}" y="${size*0.7}" text-anchor="middle" 
        font-family="Arial,Helvetica,sans-serif" font-weight="900" 
        font-size="${Math.round(size*0.52)}" fill="#1E1E28">NS</text>
</svg>`;

// Light theme: dark circle + white text
const iconSvgLight = (size, bgColor) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="${bgColor}"/>
  <text x="${size/2}" y="${size*0.7}" text-anchor="middle" 
        font-family="Arial,Helvetica,sans-serif" font-weight="900" 
        font-size="${Math.round(size*0.52)}" fill="#FFFFFF">NS</text>
</svg>`;

async function gen(name, w, h, svg) {
    await sharp(Buffer.from(svg)).resize(w, h).png().toFile(path.join(ICONS_DIR, name));
    console.log(`  ${name}: ${w}x${h}`);
}

async function main() {
    console.log("Generating bold UXP icons...\n");

    // Panel tab (23x23) — dark themes: white circle with dark text
    const svgDark23 = iconSvg(23, "#FFFFFF");
    const svgDark46 = iconSvg(46, "#FFFFFF");
    await gen("panel-dark.png", 23, 23, svgDark23);
    await gen("panel-dark@2x.png", 46, 46, svgDark46);

    // Panel tab — light themes: dark circle with white text
    const svgLight23 = iconSvgLight(23, "#1E1E28");
    const svgLight46 = iconSvgLight(46, "#1E1E28");
    await gen("panel-light.png", 23, 23, svgLight23);
    await gen("panel-light@2x.png", 46, 46, svgLight46);

    // Plugin list (23x23 per official spec)
    const svgPDark23 = iconSvg(23, "#FFFFFF");
    const svgPDark46 = iconSvg(46, "#FFFFFF");
    await gen("plugin-dark.png", 23, 23, svgPDark23);
    await gen("plugin-dark@2x.png", 46, 46, svgPDark46);

    const svgPLight23 = iconSvgLight(23, "#1E1E28");
    const svgPLight46 = iconSvgLight(46, "#1E1E28");
    await gen("plugin-light.png", 23, 23, svgPLight23);
    await gen("plugin-light@2x.png", 46, 46, svgPLight46);

    console.log("\nDone!");
}

main().catch(e => { console.error(e); process.exit(1); });
