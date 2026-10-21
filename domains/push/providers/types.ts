import type { PushProviderId } from "@/constants/push";
import type { Router } from "expo-router";

export interface PushBootstrapContext {
  router?: Router;
  hydrated: boolean;
  accessToken: string | null;
  profileId: string | undefined;
  activeChatPeerId?: string | null;
}

export interface PushProvider {
  readonly id: PushProviderId;
  init(): void;
  register(accessToken: string): Promise<string | null>;
  onLogout(accessToken?: string | null, token?: string | null): void;
  subscribe(
    ctx: PushBootstrapContext,
    onForegroundChat: (payload: {
      peerId: string;
      senderName: string;
      preview: string;
      messageId: string;
    }) => void,
    onOpen: (data: Record<string, unknown> | undefined) => void,
  ): () => void;
}
