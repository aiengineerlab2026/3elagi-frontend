import { Mail, Paperclip } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  fetchAdminContactMessage,
  fetchAdminContactMessages,
  type AdminContactMessageRow,
} from "@/domains/admin/api";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { showErrorToast } from "@/utils/toast";

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminContactMessagesWeb() {
  const colors = useColors();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [items, setItems] = useState<AdminContactMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, AdminContactMessageRow>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setItems(await fetchAdminContactMessages(accessToken));
    } catch (e) {
      showErrorToast("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!details[id] && accessToken) {
      setLoadingDetail(true);
      try {
        const row = await fetchAdminContactMessage(accessToken, id);
        setDetails((prev) => ({ ...prev, [id]: row }));
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, read_at: row.read_at } : item,
          ),
        );
      } catch (e) {
        showErrorToast("Error", (e as Error).message);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  return (
    <AdminShell
      title="Contact inbox"
      subtitle="Messages sent from the contact form in the app."
    >
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : items.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, marginTop: 24 }}>
            No contact messages yet.
          </Text>
        ) : (
          items.map((item) => {
            const open = expanded === item.id;
            const detail = details[item.id];
            const unread = !item.read_at;
            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: unread ? `${colors.primary}55` : colors.border,
                  },
                ]}
              >
                <Pressable onPress={() => void toggle(item.id)} style={styles.cardHead}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.titleRow}>
                      <Mail size={16} color={colors.primary} />
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                        {item.sender_name}
                      </Text>
                      {unread ? (
                        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.badgeText}>New</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                      {item.sender_email || "No email"}
                      {item.sender_role ? ` · ${item.sender_role}` : ""}
                      {" · "}
                      {fmt(item.created_at)}
                    </Text>
                    {!open ? (
                      <Text
                        style={{ color: colors.foreground, fontSize: 13, lineHeight: 18 }}
                        numberOfLines={2}
                      >
                        {item.message_preview}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {open ? "Hide" : "Read"}
                  </Text>
                </Pressable>

                {open ? (
                  <View style={styles.detail}>
                    {loadingDetail && !detail ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <>
                        <Text style={[styles.message, { color: colors.foreground }]}>
                          {detail?.message ?? item.message_preview}
                        </Text>
                        {(detail?.attachments ?? item.attachments)?.length ? (
                          <View style={styles.attachments}>
                            <Text style={[styles.attachLabel, { color: colors.mutedForeground }]}>
                              Attachments
                            </Text>
                            {(detail?.attachments ?? item.attachments).map((file, index) => (
                              <Pressable
                                key={`${file.url}-${index}`}
                                onPress={() => void Linking.openURL(file.url)}
                                style={[
                                  styles.attachRow,
                                  { borderColor: colors.border, backgroundColor: colors.background },
                                ]}
                              >
                                <Paperclip size={14} color={colors.primary} />
                                <Text
                                  style={{ color: colors.primary, fontWeight: "600", flex: 1 }}
                                  numberOfLines={1}
                                >
                                  {file.file_name}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 12, paddingBottom: 40 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    cursor: "pointer" as "auto",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  detail: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    whiteSpace: "pre-wrap" as "pre-wrap",
  },
  attachments: { gap: 8 },
  attachLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  attachRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    cursor: "pointer" as "auto",
  },
});
