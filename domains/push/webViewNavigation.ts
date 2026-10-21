import { getPushNotificationPath } from "@/domains/push/navigation";
import { openAsk3elagiAiWithChat } from "@/domains/ai/widget-store";
import type { PushNotificationData } from "@/domains/push/types";

type WebAppNavigator = (path: string) => void;
type WebAppInjectNavigate = (path: string) => void;

let navigate: WebAppNavigator | null = null;
let injectNavigate: WebAppInjectNavigate | null = null;
let pendingPath: string | null = null;

function flushPendingPath(): void {
  if (!pendingPath) return;
  const path = pendingPath;
  pendingPath = null;
  navigateWebAppPath(path);
}

export function setWebAppNavigator(
  fn: WebAppNavigator | null,
  inject?: WebAppInjectNavigate | null,
): void {
  navigate = fn;
  injectNavigate = inject ?? null;
  flushPendingPath();
}

export function notifyWebAppLoaded(): void {
  flushPendingPath();
}

export function navigateWebAppPath(path: string): void {
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (injectNavigate) {
    injectNavigate(normalized);
    return;
  }

  if (navigate) {
    navigate(normalized);
    return;
  }

  pendingPath = normalized;
}

export function navigateFromPushToWebApp(data: PushNotificationData): void {
  if (data.type === "ai") {
    openAsk3elagiAiWithChat(data.chatId);
    return;
  }
  navigateWebAppPath(getPushNotificationPath(data));
}
