import { Platform } from "react-native";
import { oneSignalService } from "@/domains/push/one-signal.service";
import type { PushBootstrapContext, PushProvider } from "@/domains/push/providers/types";

export class OneSignalPushProvider implements PushProvider {
  readonly id = "onesignal" as const;

  init(): void {
    if (Platform.OS === "web") return;
    oneSignalService.initialize();
  }

  async register(_accessToken: string): Promise<string | null> {
    // OneSignal uses external_id via login(); permission is requested only from the integration dialog.
    return null;
  }

  onLogout(): void {
    oneSignalService.logout();
  }

  subscribe(
    ctx: PushBootstrapContext,
    onForegroundChat: (payload: {
      peerId: string;
      senderName: string;
      preview: string;
      messageId: string;
    }) => void,
    onOpen: (data: Record<string, unknown> | undefined) => void,
  ): () => void {
    if (Platform.OS === "web") return () => {};

    if (ctx.profileId) {
      oneSignalService.login(ctx.profileId);
      void oneSignalService.ensurePushOptIn();
    }

    const removeClick = oneSignalService.addClickListener((event) => {
      onOpen(event.notification.additionalData);
    });

    const removeForeground = oneSignalService.addForegroundListener((event) => {
      const data = event.getNotification().additionalData;
      if (data?.type === "ai") {
        event.preventDefault();
        return;
      }
      if (data?.type !== "chat") {
        event.display();
        return;
      }

      const peerId = String(data.chatId ?? "");
      if (ctx.activeChatPeerId && ctx.activeChatPeerId === peerId) {
        event.preventDefault();
        return;
      }

      event.display();
      onForegroundChat({
        peerId,
        senderName: "New message",
        preview: "New message",
        messageId: String(data.messageId ?? ""),
      });
    });

    return () => {
      removeClick();
      removeForeground();
    };
  }
}
