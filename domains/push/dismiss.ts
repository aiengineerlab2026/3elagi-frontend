import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Clear delivered push notifications the user has already dealt with — reading
 * the thread in-app, or clearing the inbox. Leaving them in the tray makes the
 * app look like it still has unread work.
 *
 * No-ops on web, where there is no notification tray to clean.
 */
export async function dismissChatNotifications(chatId: string): Promise<void> {
  if (Platform.OS === "web" || !chatId) return;
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter((n) => {
          const data = n.request.content.data as Record<string, unknown> | null;
          return data?.chatId === chatId;
        })
        .map((n) =>
          Notifications.dismissNotificationAsync(n.request.identifier),
        ),
    );
  } catch {
    // Tray cleanup is cosmetic — never let it break the read flow.
  }
}

export async function dismissAllNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // ignore
  }
}
