import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

/** Maximum chat video attachment length (60 seconds). */
export const MAX_CHAT_VIDEO_DURATION_SEC = 60;
export const MAX_CHAT_VIDEO_DURATION_MS = MAX_CHAT_VIDEO_DURATION_SEC * 1000;

/** Keep under server upload cap (50 MB) with headroom for multipart overhead. */
export const MAX_CHAT_VIDEO_FILE_BYTES = 48 * 1024 * 1024;

export const CHAT_VIDEO_PICKER_OPTIONS = {
  quality: 0.65,
  allowsEditing: false,
  videoMaxDuration: MAX_CHAT_VIDEO_DURATION_SEC,
  videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
} as const;

export function isVideoWithinChatLimit(durationMs: number | null | undefined): boolean {
  if (durationMs == null || !Number.isFinite(durationMs)) return true;
  return durationMs <= MAX_CHAT_VIDEO_DURATION_MS;
}

/** Native picker uses ms; web expo-image-picker reports seconds. */
export function normalizeVideoDurationMs(duration: number | null | undefined): number | null {
  if (duration == null || !Number.isFinite(duration)) return null;
  if (duration > 0 && duration < 1000) return duration * 1000;
  return duration;
}

export function chatVideoTooLongMessage(isRTL: boolean): { title: string; body: string } {
  return {
    title: isRTL ? "الفيديو طويل جداً" : "Video too long",
    body: isRTL
      ? "الحد الأقصى لطول الفيديو دقيقة واحدة."
      : "Maximum video length is 1 minute.",
  };
}

export function chatVideoTooLargeMessage(isRTL: boolean): { title: string; body: string } {
  return {
    title: isRTL ? "الفيديو كبير جداً" : "Video too large",
    body: isRTL
      ? "الحد الأقصى لحجم الفيديو 48 ميجابايت. جرّب تسجيل فيديو أقصر أو بجودة أقل."
      : "Maximum video size is 48 MB. Try a shorter clip or lower quality recording.",
  };
}

export function getChatVideoFileSizeViolation(
  fileSizeBytes: number | null | undefined,
  isRTL: boolean,
): { title: string; body: string } | null {
  if (fileSizeBytes == null || !Number.isFinite(fileSizeBytes)) return null;
  if (fileSizeBytes > MAX_CHAT_VIDEO_FILE_BYTES) {
    return chatVideoTooLargeMessage(isRTL);
  }
  return null;
}

/** Best-effort duration probe when the picker omits metadata (common on web). */
export async function probeVideoDurationMs(uri: string): Promise<number | null> {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      const timeout = setTimeout(() => resolve(null), 10_000);
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve(Number.isFinite(video.duration) ? video.duration * 1000 : null);
      };
      video.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };
      video.src = uri;
    });
  }
  return null;
}

export async function getChatVideoLimitViolation(
  durationMs: number | null | undefined,
  uri: string,
  isRTL: boolean,
  fileSizeBytes?: number | null,
): Promise<{ title: string; body: string } | null> {
  let duration = normalizeVideoDurationMs(durationMs);
  if (duration == null) {
    duration = await probeVideoDurationMs(uri);
  }
  if (!isVideoWithinChatLimit(duration)) {
    return chatVideoTooLongMessage(isRTL);
  }
  return getChatVideoFileSizeViolation(fileSizeBytes, isRTL);
}
