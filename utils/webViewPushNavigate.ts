import { NATIVE_WEBVIEW_BRIDGE } from "@/constants/nativeWebViewBridge";

export function buildWebViewPushNavigateScript(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `(function(){window.dispatchEvent(new CustomEvent(${JSON.stringify(NATIVE_WEBVIEW_BRIDGE.PUSH_NAVIGATE)},{detail:{path:${JSON.stringify(normalized)}}}));})();true;`;
}
