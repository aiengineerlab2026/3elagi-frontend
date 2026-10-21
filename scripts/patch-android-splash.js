#!/usr/bin/env node
/**
 * Patches Android splash theme to full-screen logo (avoids circular crop).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const stylesPath = path.join(
  root,
  "android/app/src/main/res/values/styles.xml",
);
const androidRes = path.join(root, "android/app/src/main/res/drawable");
const logoSrc = path.join(root, "assets/images/splash-logo.png");
const logoDest = path.join(androidRes, "splashscreen_brand.png");
const splashFull = path.join(androidRes, "splashscreen_full.xml");

if (!fs.existsSync(stylesPath)) {
  console.warn("styles.xml not found, skipping splash patch");
  process.exit(0);
}

fs.mkdirSync(androidRes, { recursive: true });
fs.copyFileSync(logoSrc, logoDest);
fs.writeFileSync(
  splashFull,
  `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/splashscreen_background"/>
  <item>
    <bitmap android:gravity="center" android:src="@drawable/splashscreen_brand"/>
  </item>
</layer-list>
`,
);

let xml = fs.readFileSync(stylesPath, "utf8");
const splashBlock = `  <style name="Theme.App.SplashScreen" parent="AppTheme">
    <item name="android:windowBackground">@drawable/splashscreen_full</item>
    <item name="postSplashScreenTheme">@style/AppTheme</item>
  </style>`;

if (!xml.includes("splashscreen_full")) {
  xml = xml.replace(
    /  <style name="Theme\.App\.SplashScreen"[\s\S]*?<\/style>/,
    splashBlock,
  );
  fs.writeFileSync(stylesPath, xml);
}

console.log("Android splash patched (full logo, no crop)");
