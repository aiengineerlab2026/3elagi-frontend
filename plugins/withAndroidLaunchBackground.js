const fs = require("fs");
const path = require("path");
const { withAndroidStyles, withDangerousMod } = require("@expo/config-plugins");

function patchSplashStylesXml(stylesPath) {
  if (!fs.existsSync(stylesPath)) return;

  let xml = fs.readFileSync(stylesPath, "utf8");
  const splashBlock = `  <style name="Theme.App.SplashScreen" parent="AppTheme">
    <item name="android:windowBackground">@drawable/splashscreen_full</item>
    <item name="postSplashScreenTheme">@style/AppTheme</item>
  </style>`;

  xml = xml.replace(
    /  <style name="Theme\.App\.SplashScreen"[\s\S]*?<\/style>/,
    splashBlock,
  );

  if (!xml.includes("android:navigationBarColor")) {
    xml = xml.replace(
      '    <item name="android:statusBarColor">#f5f7fa</item>',
      `    <item name="android:statusBarColor">#f5f7fa</item>
    <item name="android:navigationBarColor">#f5f7fa</item>
    <item name="android:windowBackground">@color/splashscreen_background</item>`,
    );
  }

  fs.writeFileSync(stylesPath, xml);
}

/** Full-screen launch splash (no circular crop) + matching window background. */
function withAndroidLaunchBackground(config) {
  config = withAndroidStyles(config, (config) => {
    const styles = config.modResults;

    const appTheme = styles.resources.style?.find((s) => s.$?.name === "AppTheme");
    if (appTheme) {
      const items = appTheme.item ?? [];
      const names = new Set(items.map((item) => item.$?.name));
      const add = (name, value) => {
        if (!names.has(name)) items.push({ $: { name }, _: value });
      };
      add("android:navigationBarColor", "#f5f7fa");
      add("android:windowBackground", "@color/splashscreen_background");
      appTheme.item = items;
    }

    const splashIndex = styles.resources.style?.findIndex(
      (s) => s.$?.name === "Theme.App.SplashScreen",
    );
    if (splashIndex >= 0) {
      styles.resources.style[splashIndex] = {
        $: { name: "Theme.App.SplashScreen", parent: "AppTheme" },
        item: [
          {
            $: { name: "android:windowBackground" },
            _: "@drawable/splashscreen_full",
          },
          { $: { name: "postSplashScreenTheme" }, _: "@style/AppTheme" },
        ],
      };
    }

    return config;
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidRes = path.join(
        projectRoot,
        "android/app/src/main/res/drawable",
      );
      const stylesPath = path.join(
        projectRoot,
        "android/app/src/main/res/values/styles.xml",
      );
      const logoSrc = path.join(projectRoot, "assets/images/splash-logo.png");
      const logoDest = path.join(androidRes, "splashscreen_brand.png");

      await fs.promises.mkdir(androidRes, { recursive: true });
      await fs.promises.copyFile(logoSrc, logoDest);

      const splashFull = path.join(androidRes, "splashscreen_full.xml");
      await fs.promises.writeFile(
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

      patchSplashStylesXml(stylesPath);
      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidLaunchBackground;
