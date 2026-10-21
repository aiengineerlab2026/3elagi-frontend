import { ANDROID_APP_URL } from "@/constants/mobileApp";

/** Open the Android APK download page without leaving the current tab. */
export function openAndroidAppDownload(): void {
  if (typeof window === "undefined") return;
  window.open(ANDROID_APP_URL, "_blank", "noopener,noreferrer");
}
