import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EXPO_VIDEO_CALL_CHANNEL_ID } from "@/constants/expoPush";

describe("incoming call push", () => {
  it("uses the same channel id as the API sender", () => {
    // A mismatch means Android drops the notification onto the default channel
    // and the ringtone / MAX importance settings never apply.
    const provider = readFileSync(
      resolve(
        process.cwd(),
        "../3eyadahub-api/src/push-notifications/providers/expo-push.provider.ts",
      ),
      "utf8",
    );
    expect(provider).toContain(`'${EXPO_VIDEO_CALL_CHANNEL_ID}'`);
  });

  it("ships a replaceable native Android ringtone asset", () => {
    const fs = require("node:fs");
    const path = resolve(process.cwd(), "assets/sounds/incoming_call.wav");
    expect(fs.existsSync(path)).toBe(true);
    expect(fs.statSync(path).size).toBeGreaterThan(1000);
  });
});
