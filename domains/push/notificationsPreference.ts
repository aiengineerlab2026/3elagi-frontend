import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const KEY = "push_notifications_enabled_v1";

/** Default on — matches previous auto-register behavior. */
let memoryCache: boolean | null = null;

export async function getNotificationsEnabled(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (memoryCache !== null) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === null) {
      memoryCache = true;
      return true;
    }
    memoryCache = raw === "1";
    return memoryCache;
  } catch {
    memoryCache = true;
    return true;
  }
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  if (Platform.OS === "web") return;
  memoryCache = enabled;
  await AsyncStorage.setItem(KEY, enabled ? "1" : "0");
}
