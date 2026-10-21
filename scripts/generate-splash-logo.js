#!/usr/bin/env node
/**
 * Builds native splash PNG assets from SVG sources.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const assets = path.join(root, "assets/images");

const targets = [
  {
    svg: path.join(assets, "splash-mark.svg"),
    out: path.join(assets, "splash-mark.png"),
    width: 180,
    height: 180,
  },
  {
    svg: path.join(assets, "splash-logo.svg"),
    out: path.join(assets, "splash-logo.png"),
    width: 840,
    height: 200,
  },
];

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * The SVG artwork does not fill its viewBox (splash-logo leaves ~150 units of
 * empty space to the right), so a plain render puts the logo off-centre in the
 * PNG — and the native splash centres the *canvas*, not the artwork. Trim the
 * transparent margins, then re-pad symmetrically to the target box: centred,
 * and at the same scale as before.
 */
async function render({ svg, out, width, height }) {
  const source = fs.readFileSync(svg);
  const rendered = await sharp(source, { density: 300 })
    .resize(width, height, { fit: "contain", background: TRANSPARENT })
    .png()
    .toBuffer();

  const { data, info } = await sharp(rendered)
    .trim()
    .toBuffer({ resolveWithObject: true });

  const left = Math.max(0, Math.floor((width - info.width) / 2));
  const top = Math.max(0, Math.floor((height - info.height) / 2));

  await sharp(data)
    .extend({
      left,
      top,
      right: Math.max(0, width - info.width - left),
      bottom: Math.max(0, height - info.height - top),
      background: TRANSPARENT,
    })
    .png()
    .toFile(out);
  console.log("Wrote", out, `(${info.width}x${info.height} centred in ${width}x${height})`);
}

async function main() {
  for (const target of targets) {
    await render(target);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
