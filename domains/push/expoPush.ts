import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { EXPO_EAS_PROJECT_ID, EXPO_PUSH_CHANNEL_ID, EXPO_VIDEO_CALL_CHANNEL_ID } from "@/constants/expoPush";

export const CHAT_PUSH_CHANNEL_ID = EXPO_PUSH_CHANNEL_ID;
export const VIDEO_CALL_PUSH_CHANNEL_ID = EXPO_VIDEO_CALL_CHANNEL_ID;

function resolveExpoProjectId(): string {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    EXPO_EAS_PROJECT_ID
  );
}

export async function ensureChatPushChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHAT_PUSH_CHANNEL_ID, {
    name: "Chat messages",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function ensureVideoCallPushChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(VIDEO_CALL_PUSH_CHANNEL_ID, {
    name: "Video calls",
    importance: Notifications.AndroidImportance.MAX,
    // Bundled ringtone rather than the short default blip, played through the
    // ringtone stream so it uses the ring volume and keeps looping-loud.
    sound: "ringtone.wav",
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.NOTIFICATION_RINGTONE,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
    vibrationPattern: [0, 500, 250, 500, 250, 500],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });
}

export async function ensurePushChannels(): Promise<void> {
  await ensureChatPushChannel();
  await ensureVideoCallPushChannel();
}

/**
 * Clears any ringing-call notification from the tray. Called when the call
 * stops ringing (answered, declined, or the caller hung up) so a cancelled
 * call does not sit in the shade looking live.
 */
export async function dismissIncomingCallNotifications(
  sessionId?: string,
): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const shown = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      shown
        .filter((item) => {
          const data = item.request.content.data as Record<string, unknown>;
          if (data?.type !== "incoming_video_call") return false;
          if (!sessionId) return true;
          return String(data.sessionId ?? data.session_id ?? "") === sessionId;
        })
        .map((item) => Notifications.dismissNotificationAsync(item.request.identifier)),
    );
  } catch {
    // A tray we cannot read is not worth failing a call over.
  }
}

export async function requestPushPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (!Device.isDevice) {
    if (__DEV__) console.warn("[push] Push tokens require a physical device");
    return false;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return status === "granted";
}

/** Returns an Expo push token (`ExponentPushToken[...]`). */
export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web" || !Device.isDevice) return null;

  const projectId = resolveExpoProjectId();
  if (__DEV__) {
    console.log(`[push] Resolving Expo token (projectId=${projectId})`);
  }

  await ensurePushChannels();
  const granted = await requestPushPermission();
  if (!granted) {
    if (__DEV__) console.warn("[push] Notification permission denied");
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    if (__DEV__) {
      console.log(`[push] Expo token acquired: ${token.data.slice(0, 32)}...`);
    }
    return token.data;
  } catch (error) {
    console.warn(
      "[push] getExpoPushTokenAsync failed:",
      (error as Error).message,
      "— ensure FCM V1 credentials are set in EAS (eas credentials) and rebuild the app.",
    );
    return null;
  }
}
