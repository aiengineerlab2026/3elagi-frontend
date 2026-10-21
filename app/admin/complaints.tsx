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
import { useAuthStore } from "@/domains/auth/store";
import {
  fetchComplaintMessages,
  fetchComplaints,
  resolveComplaint,
  type AdminComplaint,
  type ComplaintMessage,
} from "@/domains/complaints/api";
import { formatComplaintMessageText } from "@/domains/complaints/formatMessage";
import { useColors } from "@/hooks/useColors";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

function statusColor(status: string): string {
  if (status === "accepted") return "#10b981";
  if (status === "rejected") return "#ef4444";
  return "#f59e0b";
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminComplaintsWeb() {
  const colors = useColors();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [items, setItems] = useState<AdminComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ComplaintMessage[]>>({});
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setItems(await fetchComplaints(accessToken));
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
    if (!messages[id] && accessToken) {
      setLoadingMsgs(true);
      try {
        const rows = await fetchComplaintMessages(accessToken, id);
        setMessages((prev) => ({ ...prev, [id]: rows }));
      } catch (e) {
        showErrorToast("Error", (e as Error).message);
      } finally {
        setLoadingMsgs(false);
      }
    }
  };

  const resolve = async (id: string, action: "accept" | "reject") => {
    if (!accessToken) return;
    setActingId(id);
    try {
      await resolveComplaint(accessToken, id, action);
      showSuccessToast(action === "accept" ? "Complaint accepted — credits refunded" : "Complaint rejected");
      await load();
    } catch (e) {
      showErrorToast("Error", (e as Error).message);
    } finally {
      setActingId(null);
    }
  };

  return (
    <AdminShell
      title="Complaints"
      subtitle="Review patient complaints and resolve refunds."
    >
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : items.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, marginTop: 24 }}>No complaints.</Text>
        ) : (
          items.map((c) => {
            const open = expanded === c.id;
            return (
              <View
                key={c.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                      {c.patient_name} → {c.doctor_name}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                      {fmt(c.created_at)} · {c.points} EGP
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: `${statusColor(c.status)}22` }]}>
                    <Text style={{ color: statusColor(c.status), fontWeight: "800", fontSize: 12 }}>
                      {c.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.reason, { color: colors.foreground }]}>{c.reason}</Text>

                <Pressable onPress={() => void toggle(c.id)}>
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {open ? "Hide consultation" : "View consultation"}
                  </Text>
                </Pressable>

                {open ? (
                  loadingMsgs && !messages[c.id] ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 10 }} />
                  ) : (
                    <View style={[styles.thread, { borderColor: colors.border }]}>
                      {(messages[c.id] ?? []).length === 0 ? (
                        <Text style={{ color: colors.mutedForeground }}>No messages.</Text>
                      ) : (
                        (messages[c.id] ?? []).map((m) => (
                          <View key={m.id} style={styles.msgRow}>
                            <Text style={{ color: colors.mutedForeground, fontSize: 11, minWidth: 150 }}>
                              {fmt(m.datetime)}
                            </Text>
                            <Text
                              style={{
                                color: m.from === "patient" ? colors.primary : "#0d9488",
                                fontWeight: "800",
                                fontSize: 12,
                                minWidth: 70,
                              }}
                            >
                              {m.from === "patient" ? "Patient" : "Doctor"}
                            </Text>
                            <Text style={{ color: colors.foreground, flex: 1, lineHeight: 20 }}>
                              {formatComplaintMessageText(m)}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  )
                ) : null}

                {c.status === "pending" ? (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => void resolve(c.id, "accept")}
                      disabled={actingId === c.id}
                      style={[styles.acceptBtn, { opacity: actingId === c.id ? 0.6 : 1 }]}
                    >
                      <Text style={{ color: "#fff", fontWeight: "800" }}>Accept (refund patient)</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void resolve(c.id, "reject")}
                      disabled={actingId === c.id}
                      style={[styles.rejectBtn, { borderColor: "#dc2626", opacity: actingId === c.id ? 0.6 : 1 }]}
                    >
                      <Text style={{ color: "#dc2626", fontWeight: "800" }}>Reject</Text>
                    </Pressable>
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
  content: {
    padding: 28,
    gap: 14,
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 48,
  },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  reason: { fontSize: 14, lineHeight: 20 },
  thread: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 8, marginTop: 4 },
  msgRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  acceptBtn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
  },
  rejectBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
