import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminPagePadding } from "@/constants/adminLayout";
import {
  deleteDoctor,
  fetchAdminDoctors,
  setDoctorApproval,
  type AdminDoctorRow,
} from "@/domains/admin/api";
import { isAdminRole } from "@/domains/admin/guard";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { confirmAction } from "@/utils/confirmAction";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

function statusColor(status: string): string {
  if (status === "approved") return "#10b981";
  if (status === "rejected") return "#ef4444";
  return "#f59e0b";
}

type DoctorDocument = {
  label: string;
  url: string | null | undefined;
};

function getDoctorDocuments(doctor: AdminDoctorRow): DoctorDocument[] {
  return [
    { label: "Profile photo", url: doctor.photo_url },
    { label: "Graduation certificate", url: doctor.graduation_cert_url },
    { label: "Work permit", url: doctor.work_permit_url },
    { label: "Digital signature", url: doctor.digital_signature_url },
  ];
}

export default function AdminPanelWeb() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const compact = width <= 767;
  const pagePadding = adminPagePadding(compact);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);

  const [doctors, setDoctors] = useState<AdminDoctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !isAdminRole(role)) return;
    setLoading(true);
    try {
      const rows = await fetchAdminDoctors(accessToken);
      setDoctors(rows);
    } catch (e) {
      showErrorToast("Failed to load doctors", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = doctors.filter((d) => d.approval_status === "pending");
  const others = doctors.filter((d) => d.approval_status !== "pending");

  const handleApproval = async (
    doctorId: string,
    status: "approved" | "rejected",
    successLabel: string,
  ) => {
    if (!accessToken) return;
    setActingId(doctorId);
    try {
      await setDoctorApproval(accessToken, doctorId, status);
      showSuccessToast(successLabel);
      await load();
    } catch (e) {
      showErrorToast("Action failed", (e as Error).message);
    } finally {
      setActingId(null);
    }
  };

  const handleDelete = async (doctor: AdminDoctorRow) => {
    if (!accessToken) return;
    const ok = await confirmAction(
      `Delete doctor "${doctor.name}" (${doctor.email})?\n\nThis permanently removes the doctor account, user account, and related chat messages.`,
    );
    if (!ok) return;

    setActingId(doctor.id);
    try {
      await deleteDoctor(accessToken, doctor.id);
      showSuccessToast("Doctor deleted");
      await load();
    } catch (e) {
      showErrorToast("Delete failed", (e as Error).message);
    } finally {
      setActingId(null);
    }
  };

  const renderDocuments = (doctor: AdminDoctorRow) => {
    const docs = getDoctorDocuments(doctor);
    const available = docs.filter((doc) => !!doc.url);

    return (
      <View style={styles.docSection}>
        <Text style={[styles.docSectionTitle, { color: colors.foreground }]}>
          Documents
        </Text>
        {available.length ? (
          <View style={styles.docLinks}>
            {available.map((doc) => (
              <Pressable
                key={doc.label}
                onPress={() => void Linking.openURL(doc.url!)}
                style={[
                  styles.docChip,
                  { borderColor: colors.border, backgroundColor: colors.muted },
                ]}
              >
                <Text
                  style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}
                >
                  {doc.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            No documents uploaded.
          </Text>
        )}
      </View>
    );
  };

  const compactActionBtn = compact ? styles.actionBtnCompact : null;

  const renderDoctor = (doctor: AdminDoctorRow) => {
    const busy = actingId === doctor.id;
    const speciality =
      doctor.speciality?.name_en ?? doctor.speciality?.name_ar ?? "—";

    return (
      <View
        key={doctor.id}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardTop}>
          {doctor.photo_url ? (
            <Image source={{ uri: doctor.photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.muted }]} />
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {doctor.name}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              {doctor.email}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
              {speciality} · {doctor.phone || "No phone"}
            </Text>
            <Text
              style={{
                color: statusColor(doctor.approval_status),
                fontWeight: "700",
              }}
            >
              {doctor.approval_status}
            </Text>
          </View>
        </View>

        {renderDocuments(doctor)}

        {doctor.approval_status === "pending" ? (
          <View style={[styles.actions, compact && styles.actionsCompact]}>
            <Pressable
              disabled={busy}
              onPress={() =>
                void handleApproval(doctor.id, "approved", "Doctor approved")
              }
              style={[styles.approveBtn, compactActionBtn, { opacity: busy ? 0.6 : 1 }]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.approveText}>Approve</Text>
              )}
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() =>
                void handleApproval(doctor.id, "rejected", "Doctor rejected")
              }
              style={[
                styles.rejectBtn,
                compactActionBtn,
                { borderColor: "#ef4444", opacity: busy ? 0.6 : 1 },
              ]}
            >
              <Text style={{ color: "#ef4444", fontWeight: "700" }}>Reject</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.actions, compact && styles.actionsCompact]}>
            {doctor.approval_status === "approved" ? (
              <Pressable
                disabled={busy}
                onPress={() => {
                  void (async () => {
                    const ok = await confirmAction(
                      `Block doctor "${doctor.name}"? They will no longer appear as approved.`,
                    );
                    if (!ok) return;
                    await handleApproval(doctor.id, "rejected", "Doctor blocked");
                  })();
                }}
                style={[
                  styles.rejectBtn,
                  compactActionBtn,
                  { borderColor: "#ef4444", opacity: busy ? 0.6 : 1 },
                ]}
              >
                <Text style={{ color: "#ef4444", fontWeight: "700" }}>Block</Text>
              </Pressable>
            ) : (
              <Pressable
                disabled={busy}
                onPress={() =>
                  void handleApproval(doctor.id, "approved", "Doctor approved")
                }
                style={[styles.approveBtn, compactActionBtn, { opacity: busy ? 0.6 : 1 }]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.approveText}>Approve</Text>
                )}
              </Pressable>
            )}
            <Pressable
              disabled={busy}
              onPress={() => void handleDelete(doctor)}
              style={[styles.deleteBtn, compactActionBtn, { opacity: busy ? 0.6 : 1 }]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteText}>Delete</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <AdminShell
      title="Doctors"
      subtitle="Review applications, approve doctors, and manage accounts."
    >
      <ScrollView contentContainerStyle={[styles.content, { padding: pagePadding }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Pending ({pending.length})
        </Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : pending.length ? (
          pending.map(renderDoctor)
        ) : (
          <Text style={{ color: colors.mutedForeground }}>
            No pending doctor applications.
          </Text>
        )}

        <Text
          style={[
            styles.sectionTitle,
            { color: colors.foreground, marginTop: 28 },
          ]}
        >
          All doctors ({others.length})
        </Text>
        {others.map(renderDoctor)}
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 48,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  name: { fontSize: 17, fontWeight: "800" },
  docSection: { gap: 8 },
  docSectionTitle: { fontSize: 14, fontWeight: "800" },
  docLinks: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  docChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionsCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    width: "100%",
    gap: 10,
    paddingTop: 4,
  },
  actionBtnCompact: {
    width: "100%",
    flex: 0,
    alignSelf: "stretch",
    paddingHorizontal: 16,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: "#10b981",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  approveText: { color: "#fff", fontWeight: "800" },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  deleteText: { color: "#fff", fontWeight: "800" },
});
