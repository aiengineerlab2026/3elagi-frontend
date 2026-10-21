import {
  NATIVE_WEBVIEW_BRIDGE,
  type NativeShellCameraMediaResult,
} from "@/constants/nativeWebViewBridge";
import { isNativeWebViewShell, postNativeWebViewMessage } from "@/utils/nativeWebViewBridge";

export type NativeShellCameraAsset = {
  uri: string;
  mimeType: string;
  fileName: string;
  mediaType: "image" | "video";
  preUploadedUrl: string;
};

type PendingCamera = {
  resolve: (asset: NativeShellCameraAsset | null) => void;
  reject: (error: Error) => void;
};

const pending = new Map<string, PendingCamera>();
let listenerReady = false;

export function cameraErrorMessage(
  error: NativeShellCameraMediaResult["error"],
  isRTL: boolean,
): string {
  switch (error) {
    case "permission":
      return isRTL ? "يرجى السماح بالوصول إلى الكاميرا" : "Please allow camera access.";
    case "auth":
      return isRTL ? "يرجى تسجيل الدخول مرة أخرى" : "Please sign in again.";
    case "video_too_long":
      return isRTL
        ? "الحد الأقصى لطول الفيديو دقيقة واحدة."
        : "Maximum video length is 1 minute.";
    case "video_too_large":
      return isRTL
        ? "الحد الأقصى لحجم الفيديو 48 ميجابايت."
        : "Maximum video size is 48 MB.";
    default:
      return isRTL ? "تعذر فتح الكاميرا" : "Could not open camera.";
  }
}

export function ensureNativeShellMediaListener(): void {
  if (listenerReady || typeof window === "undefined") return;
  listenerReady = true;

  window.addEventListener(NATIVE_WEBVIEW_BRIDGE.MEDIA_CAMERA_RESULT, (event) => {
    const detail = (event as CustomEvent<NativeShellCameraMediaResult>).detail;
    if (!detail?.requestId) return;

    const entry = pending.get(detail.requestId);
    if (!entry) return;
    pending.delete(detail.requestId);

    if (detail.canceled) {
      entry.resolve(null);
      return;
    }

    if (detail.error || !detail.asset) {
      entry.reject(new Error(detail.error ?? "failed"));
      return;
    }

    entry.resolve(detail.asset);
  });
}

export function pickNativeShellCamera(
  media: "image" | "video",
): Promise<NativeShellCameraAsset | null> {
  if (!isNativeWebViewShell()) {
    return Promise.resolve(null);
  }

  ensureNativeShellMediaListener();

  return new Promise((resolve, reject) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    pending.set(requestId, { resolve, reject });

    postNativeWebViewMessage({
      type: NATIVE_WEBVIEW_BRIDGE.MEDIA_CAMERA,
      requestId,
      media,
    });

    setTimeout(() => {
      if (!pending.has(requestId)) return;
      pending.delete(requestId);
      reject(new Error("Camera request timed out"));
    }, 120_000);
  });
}
