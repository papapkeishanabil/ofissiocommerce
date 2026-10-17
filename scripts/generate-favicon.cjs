const fs = require("node:fs/promises");
const sharp = require("sharp");

async function main() {
  // Reuse the actual logo mark. SVG favicons cannot load external image URLs.
  const mark = await sharp("public/brand/ofissio.png")
    .extract({ left: 20, top: 70, width: 500, height: 500 })
    .resize(128, 128)
    .png()
    .toBuffer();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0b2861"/>
  <image x="5" y="5" width="54" height="54" href="data:image/png;base64,${mark.toString("base64")}" style="filter:brightness(0) invert(1)"/>
</svg>
`;
  await fs.writeFile("public/favicon-ofissio.svg", svg);
  await fs.writeFile("public/favicon.svg", svg);
  await sharp(Buffer.from(svg)).resize(32, 32).png().toFile("public/favicon-ofissio-32.png");
  console.log("Generated self-contained SVG and 32px PNG favicons.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
