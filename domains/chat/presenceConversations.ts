import { applyLivePresence, presenceSortWeight } from "./presence";
import type { Conversation, ChatUser } from "./types";

export function applyPresenceToConversations(
  conversations: Conversation[],
): Conversation[] {
  return conversations
    .map((c) => ({
      ...c,
      user: applyLivePresence(c.user),
    }))
    .sort(
      (a, b) =>
        presenceSortWeight(a.user.presence) - presenceSortWeight(b.user.presence) ||
        (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? "") ||
        a.user.name.localeCompare(b.user.name),
    );
}

export function buildConversationFromPeer(
  user: ChatUser,
  lastMessage?: Conversation["lastMessage"],
): Conversation {
  return {
    id: user.id,
    user: applyLivePresence(user),
    lastMessage,
    unreadCount: 0,
  };
}
