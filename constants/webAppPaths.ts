/** Web app URL paths (expo-router on web). Used by native WebView shell navigation. */
export const WEB_APP_PATHS = {
  history: "/history",
  assistant: "/assistant",
  home: "/",
} as const;

export function isNormalChatWebPath(path: string): boolean {
  return /^\/chat\/[^/]+/.test(path);
}

export function isAiChatWebPath(path: string): boolean {
  return /^\/ai\/[^/]+/.test(path);
}
