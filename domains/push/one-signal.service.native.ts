import { Alert, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  LogLevel,
  OneSignal,
  type NotificationClickEvent,
  type NotificationWillDisplayEvent,
} from "react-native-onesignal";
import { EXPO_PUSH_CHANNEL_ID } from "@/constants/expoPush";
import { ONESIGNAL_APP_ID } from "@/constants/onesignal";
import type {
  OneSignalForegroundEvent,
  OneSignalNotificationClickEvent,
} from "./one-signal.service.types";

let initialized = false;
let integrationDialogShown = false;
let subscriptionObserverAttached = false;

function isRegisteredSubscriptionId(id: string | null | undefined): boolean {
  return !!id && !id.startsWith("local-");
}

function showIntegrationCompleteDialog(): void {
  Alert.alert(
    "Your OneSignal SDK integration is complete!",
    "You can now send Push Notifications & In-App Messages through OneSignal. Tap below to enable push notifications.",
    [
      {
        text: "Got it",
        onPress: () => {
          void OneSignal.Notifications.requestPermission(true);
        },
      },
    ],
    { cancelable: false },
  );
}

function maybeShowIntegrationCompleteDialog(
  subscriptionId: string | null | undefined,
): void {
  if (isRegisteredSubscriptionId(subscriptionId) && !integrationDialogShown) {
    integrationDialogShown = true;
    if (__DEV__) {
      console.log("[push] OneSignal subscription ready:", subscriptionId);
    }
    showIntegrationCompleteDialog();
  }
}

function setupPushSubscriptionObserver(): void {
  if (subscriptionObserverAttached) return;
  subscriptionObserverAttached = true;

  OneSignal.User.pushSubscription.addEventListener("change", (subscription) => {
    maybeShowIntegrationCompleteDialog(subscription.current.id);
    if (__DEV__) {
      console.log("[push] OneSignal subscription changed:", {
        id: subscription.current.id,
        token: subscription.current.token,
        optedIn: subscription.current.optedIn,
      });
    }
  });

  void OneSignal.User.pushSubscription.getIdAsync().then(
    maybeShowIntegrationCompleteDialog,
  );

  if (__DEV__) {
    void Promise.all([
      OneSignal.User.pushSubscription.getIdAsync(),
      OneSignal.User.pushSubscription.getTokenAsync(),
      OneSignal.User.pushSubscription.getOptedInAsync(),
      OneSignal.Notifications.getPermissionAsync(),
    ]).then(([id, token, optedIn, permission]) => {
      console.log("[push] OneSignal device state:", {
        subscriptionId: id,
        pushToken: token,
        optedIn,
        permission,
      });
    });
  }
}

async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(EXPO_PUSH_CHANNEL_ID, {
    name: "Chat messages",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
  });
}

/**
 * Centralized OneSignal SDK wrapper — all native OneSignal calls go through here.
 */
export const oneSignalService = {
  initialize(): void {
    if (initialized) return;

    if (__DEV__) {
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    }

    OneSignal.initialize(ONESIGNAL_APP_ID);
    void ensureAndroidNotificationChannel();
    setupPushSubscriptionObserver();
    initialized = true;

    if (__DEV__) {
      console.log("[push] OneSignal initialized");
    }
  },

  login(externalId: string): void {
    const id = externalId.trim();
    if (!id) return;
    OneSignal.login(id);
    if (__DEV__) {
      console.log("[push] OneSignal login:", id);
    }
  },

  logout(): void {
    OneSignal.logout();
    if (__DEV__) {
      console.log("[push] OneSignal logout");
    }
  },

  async ensurePushOptIn(): Promise<void> {
    const optedIn = await OneSignal.User.pushSubscription.getOptedInAsync();
    if (optedIn) return;

    const permission = await OneSignal.Notifications.getPermissionAsync();
    if (!permission) {
      await OneSignal.Notifications.requestPermission(true);
    }
  },

  addClickListener(
    listener: (event: OneSignalNotificationClickEvent) => void,
  ): () => void {
    const sdkListener = (event: NotificationClickEvent) => {
      listener({
        notification: {
          additionalData: event.notification.additionalData as
            | Record<string, unknown>
            | undefined,
        },
      });
    };
    OneSignal.Notifications.addEventListener("click", sdkListener);
    return () =>
      OneSignal.Notifications.removeEventListener("click", sdkListener);
  },

  addForegroundListener(
    listener: (event: OneSignalForegroundEvent) => void,
  ): () => void {
    const sdkListener = (event: NotificationWillDisplayEvent) => {
      if (__DEV__) {
        console.log("[push] OneSignal foreground notification received");
      }
      listener({
        getNotification: () => ({
          additionalData: event.getNotification().additionalData as
            | Record<string, unknown>
            | undefined,
        }),
        preventDefault: () => event.preventDefault(),
        display: () => event.getNotification().display(),
      });
    };
    OneSignal.Notifications.addEventListener(
      "foregroundWillDisplay",
      sdkListener,
    );
    return () =>
      OneSignal.Notifications.removeEventListener(
        "foregroundWillDisplay",
        sdkListener,
      );
  },
};
