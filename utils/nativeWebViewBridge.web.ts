import {
  NATIVE_WEBVIEW_BRIDGE,
  type NativeWebViewBridgeMessage,
  type WebViewAuthSession,
} from "@/constants/nativeWebViewBridge";

type NativeWebViewWindow = Window & {
  ReactNativeWebView?: { postMessage: (payload: string) => void };
};

export function isNativeWebViewShell(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as NativeWebViewWindow).ReactNativeWebView);
}

export function postNativeWebViewMessage(message: NativeWebViewBridgeMessage): void {
  if (!isNativeWebViewShell()) return;
  (window as NativeWebViewWindow).ReactNativeWebView?.postMessage(JSON.stringify(message));
}

export function postWebViewAuthSession(session: WebViewAuthSession): void {
  postNativeWebViewMessage({
    type: NATIVE_WEBVIEW_BRIDGE.AUTH_SESSION,
    data: session,
  });
}

export function postWebViewAuthLogout(): void {
  postNativeWebViewMessage({ type: NATIVE_WEBVIEW_BRIDGE.AUTH_LOGOUT });
}
