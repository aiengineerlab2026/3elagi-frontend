export const ANDROID_APP_PACKAGE = "com.threelagi.mobile";

/** Google Play internal testing — Android app download. */
export const ANDROID_APP_URL =
  process.env.EXPO_PUBLIC_ANDROID_APP_URL ??
  "https://play.google.com/apps/internaltest/4700519020943782529";

/** Supabase public storage — Android install prompt screenshot. */
export const ANDROID_INSTALL_PROMPT_URL =
  process.env.EXPO_PUBLIC_ANDROID_INSTALL_PROMPT_URL ??
  "https://hjluqxfmvpvtjvwzqxgi.supabase.co/storage/v1/object/public/files/static/android-install-prompt.png";

export const ANDROID_INSTALL_PROMPT_SIZE = {
  width: 280,
  height: 156,
};
