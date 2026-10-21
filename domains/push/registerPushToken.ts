import { Platform } from "react-native";
import { registerPushToken as registerPushTokenApi } from "@/domains/push/api";
import { getExpoPushToken } from "@/domains/push/expoPush";
import { getNotificationsEnabled } from "@/domains/push/notificationsPreference";

let lastRegistered: { token: string; accessToken: string } | null = null;
// The device token is stable for the install; cache it so we don't make the
// native getExpoPushToken() bridge call on every foreground resume.
let cachedToken: string | null = null;

/** Registers the Expo push token (`ExponentPushToken[...]`) with the API. */
export async function registerPushToken(accessToken: string): Promise<string | null> {
  if (Platform.OS === "web" || !accessToken) return null;
  if (!(await getNotificationsEnabled())) return null;

  const token = cachedToken ?? (await getExpoPushToken());
  if (token) cachedToken = token;
  if (!token) {
    console.warn(
      "[push] No Expo token to register — open the native app on a physical device, allow notifications, then log in again.",
    );
    return null;
  }

  if (
    lastRegistered?.token === token &&
    lastRegistered?.accessToken === accessToken
  ) {
    return token;
  }

  try {
    await registerPushTokenApi(token, accessToken);
    lastRegistered = { token, accessToken };
    console.log("[push] Expo push token registered with API");
    return token;
  } catch (error) {
    lastRegistered = null;
    console.warn("[push] API registration failed:", (error as Error).message);
    throw error;
  }
}

export function clearPushTokenRegistrationCache(): void {
  lastRegistered = null;
  cachedToken = null;
}

/** Last token known for this install (may be null if never registered). */
export function getCachedPushToken(): string | null {
  return cachedToken ?? lastRegistered?.token ?? null;
}
