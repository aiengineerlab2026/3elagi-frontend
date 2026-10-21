const fs = require("fs");
const path = require("path");
const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
} = require("@expo/config-plugins");

const NATIVE_SRC = path.join(__dirname, "..", "native", "android", "incoming-call");
const RINGTONE_SRC = path.join(__dirname, "..", "assets", "sounds", "incoming_call.wav");

const PERMISSIONS = [
  "android.permission.WAKE_LOCK",
  "android.permission.USE_FULL_SCREEN_INTENT",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_PHONE_CALL",
];

function copyNativeSources(projectRoot) {
  const javaRoot = path.join(
    projectRoot,
    "android",
    "app",
    "src",
    "main",
    "java",
    "com",
    "threelagi",
    "mobile",
  );
  const incomingDir = path.join(javaRoot, "incomingcall");
  fs.mkdirSync(incomingDir, { recursive: true });

  for (const file of fs.readdirSync(NATIVE_SRC)) {
    if (!file.endsWith(".kt")) continue;
    const destDir = file === "ThreelagiFirebaseMessagingService.kt" ? javaRoot : incomingDir;
    fs.copyFileSync(path.join(NATIVE_SRC, file), path.join(destDir, file));
  }

  const rawDir = path.join(projectRoot, "android", "app", "src", "main", "res", "raw");
  fs.mkdirSync(rawDir, { recursive: true });
  if (fs.existsSync(RINGTONE_SRC)) {
    fs.copyFileSync(RINGTONE_SRC, path.join(rawDir, "incoming_call.wav"));
  }
}

function ensurePermission(manifest, name) {
  manifest["uses-permission"] = manifest["uses-permission"] ?? [];
  const exists = manifest["uses-permission"].some((item) => item.$?.["android:name"] === name);
  if (!exists) {
    manifest["uses-permission"].push({ $: { "android:name": name } });
  }
}

function withIncomingCallNativeSources(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      copyNativeSources(config.modRequest.projectRoot);
      return config;
    },
  ]);
}

function withIncomingCallManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    PERMISSIONS.forEach((permission) => ensurePermission(manifest, permission));

    const application = manifest.application?.[0];
    if (!application) return config;

    application.service = (application.service ?? []).filter((service) => {
      const name = service.$?.["android:name"] ?? "";
      return !name.endsWith("ExpoFirebaseMessagingService");
    });

    application.service.unshift({
      $: {
        "android:name": "expo.modules.notifications.service.ExpoFirebaseMessagingService",
        "tools:node": "remove",
      },
    });

    application.service.push({
      $: {
        "android:name": ".ThreelagiFirebaseMessagingService",
        "android:exported": "false",
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": "com.google.firebase.MESSAGING_EVENT" } }],
        },
      ],
    });

    application.service.push({
      $: {
        "android:name": ".incomingcall.IncomingCallRingingService",
        "android:exported": "false",
        "android:foregroundServiceType": "phoneCall",
      },
    });

    application.receiver = application.receiver ?? [];
    application.receiver.push({
      $: {
        "android:name": ".incomingcall.IncomingCallActionReceiver",
        "android:exported": "false",
      },
    });

    return config;
  });
}

function withIncomingCallMainApplication(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes("IncomingCallPackage")) {
      contents = contents.replace(
        "import expo.modules.ReactNativeHostWrapper",
        "import expo.modules.ReactNativeHostWrapper\nimport com.threelagi.mobile.incomingcall.IncomingCallPackage",
      );
      contents = contents.replace(
        "PackageList(this).packages.apply {",
        "PackageList(this).packages.apply {\n              add(IncomingCallPackage())",
      );
    }
    config.modResults.contents = contents;
    return config;
  });
}

function withAndroidIncomingCall(config) {
  config = withIncomingCallNativeSources(config);
  config = withIncomingCallManifest(config);
  config = withIncomingCallMainApplication(config);
  return config;
}

module.exports = withAndroidIncomingCall;
