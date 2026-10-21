import { useEffect } from "react";
import { useAuthStore } from "@/domains/auth/store";
import { canUseChat } from "@/domains/chat/access";
import { useChatStore } from "@/domains/chat/store";
import { usePresenceStore } from "@/domains/presence/store";

export function PresenceChatSync() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const profile = useAuthStore((s) => s.profile);
  const role = useAuthStore((s) => s.role);
  const accessToken = useAuthStore((s) => s.accessToken);
  const onlineUsers = usePresenceStore((s) => s.users);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const syncPresence = useChatStore((s) => s.syncPresence);
  const clear = useChatStore((s) => s.clear);

  useEffect(() => {
    if (!hydrated) return;

    if (!profile || !accessToken) {
      clear();
      return;
    }

    if (!canUseChat(role)) {
      if (role) clear();
      return;
    }

    void loadConversations(accessToken, profile.id, role).catch(() => undefined);
  }, [hydrated, profile?.id, accessToken, role, loadConversations, clear]);

  const onlineUserIds = Object.keys(onlineUsers).sort().join(",");

  useEffect(() => {
    if (!hydrated || !profile || !accessToken) return;
    if (!canUseChat(role)) return;
    syncPresence();
  }, [hydrated, profile?.id, accessToken, role, onlineUserIds, syncPresence]);

  return null;
}
