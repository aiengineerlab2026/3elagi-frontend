import { useRouter, type Href } from "expo-router";
import { useEffect } from "react";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import { NATIVE_WEBVIEW_BRIDGE } from "@/constants/nativeWebViewBridge";
import { isNativeWebViewShell } from "@/utils/nativeWebViewBridge";

let pendingPushPath: string | null = null;

function navigateToPushPath(router: ReturnType<typeof useRouter>, path: string): void {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  // Push so the previous in-app screen stays in history for Back.
  router.push(normalized as Href);
  pendingPushPath = null;
}

/** Handles push notification deep links injected by the native WebView shell. */
export function NativeWebViewPushNavigation() {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const signedIn = isSignedIn(profile, accessToken);

  useEffect(() => {
    if (!isNativeWebViewShell()) return;

    const onPushNavigate = (event: Event) => {
      const path = (event as CustomEvent<{ path?: string }>).detail?.path;
      if (!path) return;

      if (!hydrated || !signedIn) {
        pendingPushPath = path;
        return;
      }

      navigateToPushPath(router, path);
    };

    window.addEventListener(NATIVE_WEBVIEW_BRIDGE.PUSH_NAVIGATE, onPushNavigate);
    return () => {
      window.removeEventListener(NATIVE_WEBVIEW_BRIDGE.PUSH_NAVIGATE, onPushNavigate);
    };
  }, [hydrated, signedIn, router]);

  useEffect(() => {
    if (!isNativeWebViewShell() || !hydrated || !signedIn || !pendingPushPath) return;
    navigateToPushPath(router, pendingPushPath);
  }, [hydrated, signedIn, router]);

  return null;
}
