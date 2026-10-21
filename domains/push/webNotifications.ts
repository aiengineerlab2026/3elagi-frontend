import { Platform } from "react-native";

export async function requestWebNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}
