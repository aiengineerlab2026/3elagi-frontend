import type { DoctorApprovalStatus, PatientProfile } from "@/domains/auth/types";

export const NATIVE_WEBVIEW_BRIDGE = {
  AUTH_SESSION: "auth:session",
  AUTH_LOGOUT: "auth:logout",
  REQUEST_AUTH: "native-shell-request-auth",
  APP_BACKGROUND: "native-app-background",
  APP_FOREGROUND: "native-app-foreground",
  /** Dispatched inside the WebView to open a push deep link via expo-router. */
  PUSH_NAVIGATE: "native-push-navigate",
  /** Web → native: open device camera for chat attachment. */
  MEDIA_CAMERA: "media:camera",
  /** Native → web: camera pick result (CustomEvent name). */
  MEDIA_CAMERA_RESULT: "native-shell-media-result",
} as const;

export type NativeWebViewBridgeMessage =
  | { type: typeof NATIVE_WEBVIEW_BRIDGE.AUTH_SESSION; data: WebViewAuthSession }
  | { type: typeof NATIVE_WEBVIEW_BRIDGE.AUTH_LOGOUT }
  | {
      type: typeof NATIVE_WEBVIEW_BRIDGE.MEDIA_CAMERA;
      requestId: string;
      media: "image" | "video";
    };

export type NativeShellCameraMediaResult = {
  requestId: string;
  canceled?: boolean;
  error?: "permission" | "auth" | "video_too_long" | "video_too_large" | "failed";
  asset?: {
    uri: string;
    mimeType: string;
    fileName: string;
    mediaType: "image" | "video";
    preUploadedUrl: string;
  };
};

export interface WebViewAuthSession {
  accessToken: string;
  profile: PatientProfile;
  role: string;
  doctorId: string | null;
  specialty: string | null;
  specialityId: string | null;
  doctorApprovalStatus: DoctorApprovalStatus | null;
  emailVerified?: boolean;
}
