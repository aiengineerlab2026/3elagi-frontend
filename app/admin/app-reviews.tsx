import { Star } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  fetchAdminAppReview,
  fetchAdminAppReviews,
  type AdminAppReviewRow,
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

function Stars({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          color="#f59e0b"
          fill={n <= rating ? "#f59e0b" : "transparent"}
        />
      ))}
    </View>
  );
}

function formatTag(tag: string): string {
  return tag.replace(/_/g, " ");
}

export default function AdminAppReviewsWeb() {
  const colors = useColors();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [items, setItems] = useState<AdminAppReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, AdminAppReviewRow>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setItems(await fetchAdminAppReviews(accessToken));
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
        const row = await fetchAdminAppReview(accessToken, id);
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
      title="Rate us reviews"
      subtitle="Star ratings and feedback submitted by signed-in users."
    >
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : items.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, marginTop: 24 }}>
            No app reviews yet.
          </Text>
        ) : (
          items.map((item) => {
            const open = expanded === item.id;
            const detail = details[item.id];
            const row = detail ?? item;
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
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                        {item.user_name}
                      </Text>
                      {unread ? (
                        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.badgeText}>New</Text>
                        </View>
                      ) : null}
                    </View>
                    <Stars rating={item.rating} />
                    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                      {item.user_email || "No email"}
                      {item.user_role ? ` · ${item.user_role}` : ""}
                      {" · "}
                      {fmt(item.created_at)}
                    </Text>
                    {!open && item.comment_preview ? (
                      <Text
                        style={{ color: colors.foreground, fontSize: 13, lineHeight: 18 }}
                        numberOfLines={2}
                      >
                        {item.comment_preview}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {open ? "Hide" : "View"}
                  </Text>
                </Pressable>

                {open ? (
                  <View style={styles.detail}>
                    {loadingDetail && !detail ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <View style={{ gap: 10 }}>
                        {(row.improvement_tags ?? []).length ? (
                          <>
                            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                              Suggested improvements
                            </Text>
                            <View style={styles.tagRow}>
                              {row.improvement_tags.map((tag) => (
                                <View
                                  key={tag}
                                  style={[
                                    styles.tag,
                                    {
                                      backgroundColor: `${colors.primary}12`,
                                      borderColor: `${colors.primary}33`,
                                    },
                                  ]}
                                >
                                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>
                                    {formatTag(tag)}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </>
                        ) : null}
                        {row.comment ? (
                          <>
                            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                              Comment
                            </Text>
                            <Text style={[styles.message, { color: colors.foreground }]}>
                              {row.comment}
                            </Text>
                          </>
                        ) : (
                          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                            No written comment.
                          </Text>
                        )}
                      </View>
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
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  stars: { flexDirection: "row", gap: 2 },
  detail: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.25)",
    paddingTop: 12,
  },
  message: { fontSize: 14, lineHeight: 20 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
