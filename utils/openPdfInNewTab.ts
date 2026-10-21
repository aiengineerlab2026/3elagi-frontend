import { Linking, Platform } from "react-native";

/**
 * Open a PDF URL in a new browser tab (web) or the system viewer (native).
 * On web, pass `pendingTab` from a sync `window.open("about:blank")` in the
 * click handler so popup blockers don't swallow the async navigation.
 */
export async function openPdfInNewTab(
  pdfUrl: string,
  pendingTab?: Window | null,
): Promise<void> {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (pendingTab && !pendingTab.closed) {
      try {
        pendingTab.opener = null;
      } catch {
        // ignore cross-origin / browser restrictions
      }
      pendingTab.location.href = pdfUrl;
      pendingTab.focus?.();
      return;
    }
    const opened = window.open(pdfUrl, "_blank", "noopener,noreferrer");
    if (opened) {
      opened.focus?.();
      return;
    }
    // Last resort if popup was blocked
    window.location.assign(pdfUrl);
    return;
  }
  await Linking.openURL(pdfUrl);
}

/** Call synchronously in the press handler before awaiting the PDF URL. */
export function openBlankPdfTab(): Window | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  return window.open("about:blank", "_blank");
}
