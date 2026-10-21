import type {
  OneSignalForegroundEvent,
  OneSignalNotificationClickEvent,
} from "./one-signal.service.types";

/** Web stub — OneSignal is native-only. */
export const oneSignalService = {
  initialize(): void {},
  login(_externalId: string): void {},
  logout(): void {},
  addClickListener(
    _listener: (event: OneSignalNotificationClickEvent) => void,
  ): () => void {
    return () => {};
  },
  addForegroundListener(
    _listener: (event: OneSignalForegroundEvent) => void,
  ): () => void {
    return () => {};
  },
  async ensurePushOptIn(): Promise<void> {},
};
