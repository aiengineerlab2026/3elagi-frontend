import { CLARITY_MOBILE_PROJECT_ID } from "@/constants/clarity";
import { useAuthStore } from "@/domains/auth/store";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

let nativeClarityReady = false;

/**
 * Microsoft Clarity on native (see @microsoft/react-native-clarity).
 * Web uses the script tag in `public/index.html` / `+html.tsx`.
 *
 * Requires a rebuilt dev/APK build — does not run in Expo Go.
 */
export function ClarityBootstrap() {
  const userId = useAuthStore((s) => s.profile?.id);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (Platform.OS === "web") return;

    // Inline require keeps the native module out of the web bundle.
    const Clarity =
      require("@microsoft/react-native-clarity") as typeof import("@microsoft/react-native-clarity");

    Clarity.initialize(CLARITY_MOBILE_PROJECT_ID, {
      logLevel: __DEV__ ? Clarity.LogLevel.Verbose : Clarity.LogLevel.None,
    });
    nativeClarityReady = true;

    Clarity.setOnSessionStartedCallback(() => {
      const id = userIdRef.current;
      if (id) {
        void Clarity.setCustomUserId(id);
      }

      if (__DEV__) {
        void Clarity.getCurrentSessionUrl().then((url: string | undefined) => {
          console.log("[clarity] session started:", url ?? "(url pending)");
        });
      }
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" || !nativeClarityReady || !userId) return;
    const Clarity =
      require("@microsoft/react-native-clarity") as typeof import("@microsoft/react-native-clarity");
    void Clarity.setCustomUserId(userId);
  }, [userId]);

  return null;
}
