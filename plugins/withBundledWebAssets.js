const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(from, to);
    else fs.copyFileSync(from, to);
  }
  return true;
}

/** Copies `assets/web/` into native projects for offline WebView loading. */
module.exports = function withBundledWebAssets(config) {
  config = withDangerousMod(config, [
    "android",
    (cfg) => {
      const src = path.join(cfg.modRequest.projectRoot, "assets/web");
      const dest = path.join(
        cfg.modRequest.platformProjectRoot,
        "app/src/main/assets/web",
      );
      if (copyDirRecursive(src, dest)) {
        console.log(`[withBundledWebAssets] Copied web bundle → ${dest}`);
      }
      return cfg;
    },
  ]);

  config = withDangerousMod(config, [
    "ios",
    (cfg) => {
      const src = path.join(cfg.modRequest.projectRoot, "assets/web");
      const dest = path.join(cfg.modRequest.platformProjectRoot, "web");
      if (copyDirRecursive(src, dest)) {
        console.log(`[withBundledWebAssets] Copied web bundle → ${dest}`);
      }
      return cfg;
    },
  ]);

  return config;
};
