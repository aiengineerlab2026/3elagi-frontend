import { router } from "expo-router";
import { Search } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { ADMIN_MOBILE_MAX_WIDTH, adminPagePadding } from "@/constants/adminLayout";
import { AdminShell } from "@/components/admin/AdminShell";
import { AppTextInput } from "@/components/AppTextInput";
import { ChatHistoryList } from "@/components/ChatHistoryList";
import {
  fetchAdminDoctors,
  fetchAdminPatients,
  type AdminDoctorRow,
  type AdminPatientRow,
} from "@/domains/admin/api";
import { fetchConversations } from "@/domains/chat/api";
import { chatRepository } from "@/domains/chat/repository";
import type { ChatMessage, ChatUser, Conversation } from "@/domains/chat/types";
import { isAdminRole } from "@/domains/admin/guard";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { showErrorToast } from "@/utils/toast";

type Tab = "doctors" | "patients";

/** Support inbox: every doctor and patient, styled like the main Chat history tab. */
export default function AdminChatsWeb() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const compact = width <= ADMIN_MOBILE_MAX_WIDTH;
  const pagePadding = adminPagePadding(compact);
  const { isRTL } = useI18n();
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const selfId = useAuthStore((s) => s.profile?.id);
  const [tab, setTab] = useState<Tab>("doctors");
  const [doctors, setDoctors] = useState<AdminDoctorRow[]>([]);
  const [patients, setPatients] = useState<AdminPatientRow[]>([]);
  const [peerById, setPeerById] = useState<Map<string, ChatUser>>(new Map());
  const [conversationByPeer, setConversationByPeer] = useState<
    Map<string, { lastMessage?: ChatMessage; unreadCount: number }>
  >(new Map());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !selfId || !isAdminRole(role)) return;
    setLoading(true);
    setError(null);
    try {
      const [doctorRows, patientRows, conversations] = await Promise.all([
        fetchAdminDoctors(accessToken),
        fetchAdminPatients(accessToken),
        fetchConversations(accessToken, selfId).catch(() => []),
      ]);
      setDoctors(doctorRows);
      setPatients(patientRows);

      const peers = new Map<string, ChatUser>();
      const threads = new Map<
        string,
        { lastMessage?: ChatMessage; unreadCount: number }
      >();
      for (const row of conversations) {
        peers.set(row.peerId, row.user);
        threads.set(row.peerId, {
          lastMessage: row.lastMessage,
          unreadCount: row.unreadCount,
        });
      }
      setPeerById(peers);
      setConversationByPeer(threads);
    } catch (e) {
      setError((e as Error).message);
      showErrorToast("Could not load members", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, selfId, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const doctorCount = useMemo(
    () => doctors.filter((d) => !!d.user_id).length,
    [doctors],
  );
  const patientCount = useMemo(
    () => patients.filter((p) => !!p.user_id).length,
    [patients],
  );

  const conversations: Conversation[] = useMemo(() => {
    const rows =
      tab === "doctors"
        ? doctors
            .filter((d) => !!d.user_id)
            .map((d) => {
              const thread = conversationByPeer.get(d.user_id);
              const peer =
                peerById.get(d.user_id) ??
                ({
                  id: d.user_id,
                  name: d.name,
                  photoUrl: d.photo_url,
                  presence: "offline",
                  role: "doctor",
                  specialty: d.speciality?.name_en ?? undefined,
                  country: d.country?.trim().toUpperCase() || undefined,
                  consultationPrice: d.consultation_price ?? undefined,
                } satisfies ChatUser);
              return {
                id: d.user_id,
                user: peer,
                lastMessage: thread?.lastMessage,
                unreadCount: thread?.unreadCount ?? 0,
              } satisfies Conversation;
            })
        : patients
            .filter((p) => !!p.user_id)
            .map((p) => {
              const thread = conversationByPeer.get(p.user_id);
              const peer =
                peerById.get(p.user_id) ??
                ({
                  id: p.user_id,
                  name: p.name,
                  photoUrl: p.photo_url,
                  presence: "offline",
                  role: "patient",
                  country: p.country?.trim().toUpperCase() || undefined,
                } satisfies ChatUser);
              return {
                id: p.user_id,
                user: peer,
                lastMessage: thread?.lastMessage,
                unreadCount: thread?.unreadCount ?? 0,
              } satisfies Conversation;
            });

    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter(
          (c) =>
            c.user.name.toLowerCase().includes(q) ||
            (c.user.specialty ?? "").toLowerCase().includes(q) ||
            (c.user.country ?? "").toLowerCase().includes(q),
        )
      : rows;

    return filtered.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt).getTime()
        : 0;
      const bTime = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt).getTime()
        : 0;
      if (aTime !== bTime) return bTime - aTime;
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      return a.user.name.localeCompare(b.user.name, undefined, {
        sensitivity: "base",
      });
    });
  }, [tab, doctors, patients, query, conversationByPeer, peerById]);

  const openChat = (peerId: string) => {
    const conv = conversations.find((c) => c.id === peerId);
    if (conv) {
      chatRepository.cacheUsers([conv.user]);
    }
    router.push(`/chat/${peerId}`);
  };

  const dir = isRTL ? "row-reverse" : "row";
  const activeCount = tab === "doctors" ? doctorCount : patientCount;
  const unreadInTab = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <AdminShell
      title="Chats"
      subtitle="Message any doctor or patient directly."
    >
      <View style={[styles.page, { paddingHorizontal: pagePadding, paddingVertical: compact ? 12 : 20 }]}>
        <View
          style={[
            styles.card,
            compact && styles.cardCompact,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.foreground,
            },
          ]}
        >
          <View style={[styles.tabBar, { backgroundColor: colors.muted }]}>
            {(["doctors", "patients"] as Tab[]).map((key) => {
              const active = tab === key;
              const count = key === "doctors" ? doctorCount : patientCount;
              return (
                <Pressable
                  key={key}
                  onPress={() => setTab(key)}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: active ? colors.card : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? colors.foreground : colors.mutedForeground,
                      fontWeight: active ? "800" : "600",
                      fontSize: 13,
                      textTransform: "capitalize",
                    }}
                  >
                    {key}
                  </Text>
                  <View
                    style={[
                      styles.tabCount,
                      {
                        backgroundColor: active
                          ? `${colors.primary}18`
                          : colors.background,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? colors.primary : colors.mutedForeground,
                        fontSize: 11,
                        fontWeight: "800",
                      }}
                    >
                      {count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                flexDirection: dir,
              },
            ]}
          >
            <Search size={16} color={colors.mutedForeground} />
            <AppTextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.searchInput,
                { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
              ]}
            />
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {loading
                ? "Loading…"
                : query.trim()
                  ? `${conversations.length} of ${activeCount}`
                  : `${activeCount} ${tab}`}
            </Text>
            {!loading && unreadInTab > 0 ? (
              <Text style={[styles.metaText, { color: colors.primary, fontWeight: "700" }]}>
                {unreadInTab} unread
              </Text>
            ) : null}
          </View>

          <View style={styles.listWrap}>
            <ChatHistoryList
              conversations={conversations}
              loading={loading}
              error={error}
              isRTL={isRTL}
              onSelect={openChat}
              emptyLabel={
                query.trim()
                  ? `No ${tab} match your search`
                  : `No ${tab} with linked accounts yet`
              }
              emptyPreview="Tap to start conversation"
            />
          </View>
        </View>
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingBottom: 28,
    minHeight: 0,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    minHeight: 480,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
  },
  cardCompact: {
    minHeight: 360,
  },
  tabBar: {
    flexDirection: "row",
    margin: 12,
    marginBottom: 0,
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    cursor: "pointer" as "auto",
  },
  tabCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  metaText: { fontSize: 12, fontWeight: "600" },
  listWrap: {
    flex: 1,
    minHeight: 0,
  },
});
