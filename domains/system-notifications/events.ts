export const SYSTEM_NOTIFICATION_EVENTS = {
  RECEIVED: "system-notification:received",
} as const;

export interface SystemNotificationPayload {
  title?: string;
  body: string;
}
