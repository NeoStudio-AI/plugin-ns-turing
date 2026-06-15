// Encode SVG icons to base64 data URIs for <img> tags
// UXP CEF may not render inline SVG, but <img src="data:..."> is more reliable

var fs = require("fs");

var SVGS = {
    "settings": '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><path d="M7.5 0h3v2.2l3-1 .8 2.2-2.8 2 2 2.8-.8 2.2-3-1V13h-3v-3.4l-3 1-.8-2.2 2.8-2-2-2.8.8-2.2 3 1V0zM9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zm0 2a3.5 3.5 0 110 7 3.5 3.5 0 010-7z" fill="#b8b8b8" fill-rule="evenodd"/></svg>',
    "chevron-down": '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 12 12"><path d="M2.5 4.5L6 8.5 9.5 4.5H8L6 6.8 4 4.5z" fill="#b8b8b8"/></svg>',
    "chevron-left": '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><path d="M12 3.5L5.5 9l6.5 5.5H10.5L4.5 9l6-5.5z" fill="#b8b8b8"/></svg>',
    "close": '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><path d="M2 4l2-2 5 5 5-5 2 2-5 5 5 5-2 2-5-5-5 5-2-2 5-5z" fill="#b8b8b8"/></svg>',
    "eye": '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><path d="M9 2C4.5 2 1 9 1 9s3.5 7 8 7 8-7 8-7-3.5-7-8-7zm0 11a4 4 0 110-8 4 4 0 010 8zm0-2a2 2 0 100-4 2 2 0 000 4z" fill="#b8b8b8" fill-rule="evenodd"/></svg>',
    "eye-off": '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><path d="M2 1l15 15-1.5 1.5-3-3C10.5 15 9 14 9 14c-4.5 0-8-5-8-5s1.5-3 4-5L2.5 1.5 2 1zm2.5 6.5L3 9s3 5 6 5 3.5-1 4.5-2L10 8.5 9 10a2 2 0 01-2-2l.3-1.3L4.5 7.5zm3-4l1 .5A5 5 0 0115 9a9 9 0 01-2 3.5l1.5 1.5c2-1.5 3.5-5 3.5-5s-2-4-5.5-5.5L7.5 3.5z" fill="#b8b8b8"/></svg>',
    "check": '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path d="M10.5 2.5L5 9 2 6l1-1 2 2 4.5-5.5z" fill="#b8b8b8"/></svg>',
    "x-circle": '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path d="M6 .5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zm0 2a3.5 3.5 0 110 7 3.5 3.5 0 010-7z" fill="#b8b8b8" fill-rule="evenodd"/><path d="M4 4.5l.5-.5L6 5.5l1.5-1.5.5.5L6.5 6 8 7.5l-.5.5L6 6.5 4.5 8l-.5-.5L5.5 6z" fill="#b8b8b8"/></svg>',
    "edit": '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><path d="M10 0l4 4-1.5 1.5L10 3 1 12v2h2l9-9 2.5 2.5L11 4l-1.5-1.5L12 0 10 0zM3 11l-1 1v.5h.5l1-1V11h-.5z" fill="#b8b8b8"/></svg>',
    "trash": '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><path d="M5 1h4l.5.5V3h3v1h-1l-1 9H3.5l-1-9H1.5V3h3V1.5L5 1zm1 1v1h2V2H6zM3.5 4l1 8h5l1-8h-7zM5.5 5.5h1v5h-1zm2 0h1v5h-1z" fill="#b8b8b8"/></svg>'
};

var result = {};
for (var key in SVGS) {
    var b64 = Buffer.from(SVGS[key]).toString("base64");
    result[key] = "data:image/svg+xml;base64," + b64;
}

fs.writeFileSync("scripts/icons-base64.json", JSON.stringify(result, null, 2));
console.log("Generated " + Object.keys(result).length + " base64 icons");
