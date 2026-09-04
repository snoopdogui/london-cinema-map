// node scripts/generate-icons.js
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// Cinema map icon: dark navy background, indigo film strips, map pin on screen
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background -->
  <rect width="512" height="512" rx="96" fill="#0f172a"/>

  <!-- Film strip top -->
  <rect x="72" y="104" width="368" height="48" rx="8" fill="#4338ca"/>
  <rect x="104" y="116" width="24" height="24" rx="5" fill="#0f172a"/>
  <rect x="152" y="116" width="24" height="24" rx="5" fill="#0f172a"/>
  <rect x="200" y="116" width="24" height="24" rx="5" fill="#0f172a"/>
  <rect x="248" y="116" width="24" height="24" rx="5" fill="#0f172a"/>
  <rect x="296" y="116" width="24" height="24" rx="5" fill="#0f172a"/>
  <rect x="344" y="116" width="24" height="24" rx="5" fill="#0f172a"/>
  <rect x="392" y="116" width="24" height="24" rx="5" fill="#0f172a"/>

  <!-- Screen surround -->
  <rect x="72" y="160" width="368" height="192" rx="8" fill="#1e293b"/>

  <!-- Screen -->
  <rect x="92" y="178" width="328" height="156" rx="4" fill="#e2e8f0"/>

  <!-- Map pin head (circle) -->
  <circle cx="256" cy="248" r="44" fill="#6366f1"/>
  <circle cx="256" cy="244" r="22" fill="white"/>
  <!-- Map pin tail -->
  <polygon points="232,272 280,272 256,312" fill="#6366f1"/>

  <!-- Film strip bottom -->
  <rect x="72" y="360" width="368" height="48" rx="8" fill="#4338ca"/>
  <rect x="104" y="372" width="24" height="24" rx="5" fill="#0f172a"/>
  <rect x="152" y="372" width="24" height="24" rx="5" fill="#0f172a"/>
  <rect x="200" y="372" width="24" height="24" rx="5" fill="#0f172a"/>
  <rect x="248" y="372" width="24" height="24" rx="5" fill="#0f172a"/>
  <rect x="296" y="372" width="24" height="24" rx="5" fill="#0f172a"/>
  <rect x="344" y="372" width="24" height="24" rx="5" fill="#0f172a"/>
  <rect x="392" y="372" width="24" height="24" rx="5" fill="#0f172a"/>
</svg>`;

const svgBuf = Buffer.from(svg);
const outDir = path.join(__dirname, "../public/icons");

(async () => {
  await sharp(svgBuf).resize(512, 512).png().toFile(path.join(outDir, "icon-512.png"));
  console.log("icon-512.png done");

  await sharp(svgBuf).resize(192, 192).png().toFile(path.join(outDir, "icon-192.png"));
  console.log("icon-192.png done");

  await sharp(svgBuf).resize(180, 180).png().toFile(path.join(outDir, "apple-touch-icon.png"));
  console.log("apple-touch-icon.png done");
})();
