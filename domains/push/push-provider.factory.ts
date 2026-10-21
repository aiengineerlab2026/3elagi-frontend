import { ACTIVE_PUSH_PROVIDER } from "@/constants/push";
import { ExpoPushProvider } from "@/domains/push/providers/expo-push.provider";
import { OneSignalPushProvider } from "@/domains/push/providers/onesignal-push.provider";
import type { PushProvider } from "@/domains/push/providers/types";

const expoProvider = new ExpoPushProvider();
const oneSignalProvider = new OneSignalPushProvider();

export function getPushProvider(): PushProvider {
  if (ACTIVE_PUSH_PROVIDER === "onesignal") {
    return oneSignalProvider;
  }
  return expoProvider;
}
