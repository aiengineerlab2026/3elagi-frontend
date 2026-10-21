export type OneSignalNotificationClickEvent = {
  notification: { additionalData?: Record<string, unknown> };
};

export type OneSignalForegroundEvent = {
  getNotification: () => { additionalData?: Record<string, unknown> };
  preventDefault: () => void;
  display: () => void;
};
