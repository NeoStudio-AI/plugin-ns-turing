/* ============================================================
   Generate PNG icons from inline SVG definitions
   Output: icons/ *.png (18px) and *@2x.png (36px)
   ============================================================ */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const iconsDir = path.join(__dirname, "..", "icons");
const sizes = [
  { name: "", w: 18 },
  { name: "@2x", w: 36 },
];

// ---- Icon SVG definitions (extracted from index.html & settings.js) ----
const icons = {
  // index.html line 15 - settings gear
  "settings": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="2.5" stroke="#999" stroke-width="1.2"/>
    <path d="M9 1.5V3m0 12v1.5M1.5 9H3m12 0h1.5M3.7 3.7l1.06 1.06m8.48 8.48l1.06 1.06M3.7 14.3l1.06-1.06m8.48-8.48l1.06-1.06" stroke="#999" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  // index.html line 72 - chevron down
  "chevron-down": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none">
    <path d="M3 4.5l3 3 3-3" stroke="#999" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  // index.html line 85 - back arrow (chevron left)
  "chevron-left": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="none">
    <path d="M11 4L6 9l5 5" stroke="#999" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  // index.html lines 103, 141 - close X
  "close": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="none">
    <path d="M5 5l8 8M13 5l-8 8" stroke="#999" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,

  // index.html line 150, settings.js lines 470, 505 - eye visible
  "eye": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="none">
    <path d="M1 9s3-5.5 8-5.5S17 9 17 9s-3 5.5-8 5.5S1 9 1 9Z" stroke="#999" stroke-width="1.3"/>
    <circle cx="9" cy="9" r="2.5" stroke="#999" stroke-width="1.3"/>
  </svg>`,

  // settings.js line 502 - eye off (hidden)
  "eye-off": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" fill="none">
    <path d="M6.5 6.5a3.5 3.5 0 0 1 5 5M10.88 11.12A3.47 3.47 0 0 1 9 11.5 3.5 3.5 0 0 1 5.5 8c0-.68.2-1.32.53-1.85" stroke="#999" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M1 2l16 16" stroke="#999" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M5.8 4.4C6.77 3.89 7.86 3.5 9 3.5c5 0 8 5.5 8 5.5-.7 1.34-1.69 2.68-2.9 3.7" stroke="#999" stroke-width="1.3" stroke-linecap="round"/>
  </svg>`,

  // settings.js line 205 - checkmark
  "check": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-6" stroke="#999" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  // settings.js line 207 - x-circle (key invalid)
  "x-circle": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none">
    <circle cx="6" cy="6" r="5" stroke="#999" stroke-width="1.2"/>
    <path d="M4 4l4 4M8 4l-4 4" stroke="#999" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  // settings.js line 227 - edit pencil
  "edit": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="none">
    <path d="M10 1.5l2.5 2.5L5 11.5H2.5V9L10 1.5Z" stroke="#999" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M8.5 3L11 5.5" stroke="#999" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  // settings.js line 236 - trash delete
  "trash": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 3.5h9M5 3.5V2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1.5M5.5 6v5M8.5 6v5" stroke="#999" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M3 3.5l.8 8.5a.5.5 0 0 0 .5.5h5.4a.5.5 0 0 0 .5-.5l.8-8.5" stroke="#999" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`,
};

// ---- Danger variants (red stroke) for delete and close in danger context ----
const dangerIcons = {
  "close-danger": icons.close.replace(/"#999"/g, '"#e74c3c"'),
  "trash-danger": icons.trash.replace(/"#999"/g, '"#e74c3c"'),
};
Object.assign(icons, dangerIcons);

async function main() {
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  for (const [name, svg] of Object.entries(icons)) {
    for (const { name: suffix, w } of sizes) {
      const outPath = path.join(iconsDir, `${name}${suffix}.png`);
      await sharp(Buffer.from(svg))
        .resize(w, w)
        .png()
        .toFile(outPath);
      console.log(`  ✅ ${name}${suffix}.png (${w}x${w})`);
    }
  }

  console.log(`\nDone! ${Object.keys(icons).length} icon sets generated.`);
}

main().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
