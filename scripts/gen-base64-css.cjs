/* Generate icons-base64.css with background-image data URIs */
const fs = require("fs");
const path = require("path");

const iconsDir = path.join(__dirname, "..", "icons");
const files = fs.readdirSync(iconsDir).filter(
  f => f.endsWith(".png") &&
       !f.includes("panel") &&
       !f.includes("plugin") &&
       !f.includes("@2x")
);

let css = "/* Auto-generated icon background-image rules */\n";
for (const f of files.sort()) {
  const b64 = fs.readFileSync(path.join(iconsDir, f)).toString("base64");
  const name = path.basename(f, ".png");
  css += `.icon-${name} { background-image: url(data:image/png;base64,${b64}); }\n`;
}

fs.writeFileSync(path.join(iconsDir, "icons-base64.css"), css);
console.log("Written " + files.length + " icons to icons/icons-base64.css (" + css.length + " chars)");
