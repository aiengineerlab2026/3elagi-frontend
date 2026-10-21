import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import type { RefObject } from "react";
import {
  NATIVE_WEBVIEW_BRIDGE,
  type NativeShellCameraMediaResult,
} from "@/constants/nativeWebViewBridge";

// Minimal shape we use from a WebView ref — avoids depending on the
// react-native-webview package (removed; the native WebView shell is gone).
type WebViewLike = { injectJavaScript: (script: string) => void };
import { uploadFile } from "@/domains/medical/api";
import { useAuthStore } from "@/domains/auth/store";
import {
  CHAT_VIDEO_PICKER_OPTIONS,
  getChatVideoFileSizeViolation,
  isVideoWithinChatLimit,
  normalizeVideoDurationMs,
} from "@/utils/chatVideoLimits";

function sendMediaResult(
  webViewRef: RefObject<WebViewLike | null>,
  payload: NativeShellCameraMediaResult,
): void {
  const detail = JSON.stringify(payload);
  webViewRef.current?.injectJavaScript(
    `window.dispatchEvent(new CustomEvent(${JSON.stringify(NATIVE_WEBVIEW_BRIDGE.MEDIA_CAMERA_RESULT)},{detail:${detail}}));true;`,
  );
}

export async function handleNativeShellCameraPick(
  requestId: string,
  media: "image" | "video",
  webViewRef: RefObject<WebViewLike | null>,
): Promise<void> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      sendMediaResult(webViewRef, { requestId, error: "permission" });
      return;
    }

    if (media === "video") {
      const mic = await Audio.requestPermissionsAsync();
      if (mic.status !== "granted") {
        sendMediaResult(webViewRef, { requestId, error: "permission" });
        return;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: media === "image" ? ["images"] : ["videos"],
      quality: media === "image" ? 0.85 : CHAT_VIDEO_PICKER_OPTIONS.quality,
      allowsEditing: media === "image",
      ...(media === "video" ? CHAT_VIDEO_PICKER_OPTIONS : {}),
    });

    if (result.canceled || !result.assets[0]) {
      sendMediaResult(webViewRef, { requestId, canceled: true });
      return;
    }

    const asset = result.assets[0];

    if (media === "video") {
      const durationMs = normalizeVideoDurationMs(asset.duration ?? null);
      if (!isVideoWithinChatLimit(durationMs)) {
        sendMediaResult(webViewRef, { requestId, error: "video_too_long" });
        return;
      }
      if (getChatVideoFileSizeViolation(asset.fileSize ?? null, false)) {
        sendMediaResult(webViewRef, { requestId, error: "video_too_large" });
        return;
      }
    }

    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      sendMediaResult(webViewRef, { requestId, error: "auth" });
      return;
    }

    const mimeType =
      asset.mimeType ?? (media === "image" ? "image/jpeg" : "video/mp4");
    const fileName =
      asset.fileName ??
      `${media}-${Date.now()}.${media === "video" ? "mp4" : "jpg"}`;

    const uploaded = await uploadFile(asset.uri, mimeType, fileName, accessToken);

    sendMediaResult(webViewRef, {
      requestId,
      asset: {
        uri: uploaded.url,
        mimeType,
        fileName,
        mediaType: media,
        preUploadedUrl: uploaded.url,
      },
    });
  } catch {
    sendMediaResult(webViewRef, { requestId, error: "failed" });
  }
}
