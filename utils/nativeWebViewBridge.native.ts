import type { RefObject } from "react";
import { useAuthStore } from "@/domains/auth/store";
import {
  NATIVE_WEBVIEW_BRIDGE,
  type NativeWebViewBridgeMessage,
  type WebViewAuthSession,
} from "@/constants/nativeWebViewBridge";
import { handleNativeShellCameraPick } from "@/utils/nativeWebViewMedia.native";

// Minimal shape we use from a WebView ref — avoids depending on the
// react-native-webview package (removed; the native WebView shell is gone).
type WebViewLike = { injectJavaScript: (script: string) => void };

function isWebViewAuthSession(value: unknown): value is WebViewAuthSession {
  if (!value || typeof value !== "object") return false;
  const session = value as WebViewAuthSession;
  return (
    typeof session.accessToken === "string" &&
    !!session.accessToken &&
    typeof session.profile?.id === "string" &&
    typeof session.role === "string"
  );
}

function parseBridgeMessage(raw: string): NativeWebViewBridgeMessage | null {
  try {
    const parsed = JSON.parse(raw) as {
      type?: string;
      data?: unknown;
      requestId?: string;
      media?: string;
    };
    if (parsed.type === NATIVE_WEBVIEW_BRIDGE.AUTH_SESSION && isWebViewAuthSession(parsed.data)) {
      return { type: NATIVE_WEBVIEW_BRIDGE.AUTH_SESSION, data: parsed.data };
    }
    if (parsed.type === NATIVE_WEBVIEW_BRIDGE.AUTH_LOGOUT) {
      return { type: NATIVE_WEBVIEW_BRIDGE.AUTH_LOGOUT };
    }
    if (
      parsed.type === NATIVE_WEBVIEW_BRIDGE.MEDIA_CAMERA &&
      typeof parsed.requestId === "string" &&
      (parsed.media === "image" || parsed.media === "video")
    ) {
      return {
        type: NATIVE_WEBVIEW_BRIDGE.MEDIA_CAMERA,
        requestId: parsed.requestId,
        media: parsed.media,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function isNativeWebViewShell(): boolean {
  return false;
}

export function handleNativeWebViewMessage(
  raw: string,
  webViewRef: RefObject<WebViewLike | null>,
): void {
  const message = parseBridgeMessage(raw);
  if (!message) return;

  if (message.type === NATIVE_WEBVIEW_BRIDGE.AUTH_SESSION) {
    useAuthStore.getState().applyWebViewSession(message.data);
    return;
  }

  if (message.type === NATIVE_WEBVIEW_BRIDGE.AUTH_LOGOUT) {
    useAuthStore.getState().clearWebViewSession();
    return;
  }

  if (message.type === NATIVE_WEBVIEW_BRIDGE.MEDIA_CAMERA) {
    void handleNativeShellCameraPick(message.requestId, message.media, webViewRef);
  }
}
