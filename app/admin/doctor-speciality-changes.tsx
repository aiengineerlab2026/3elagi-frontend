import { Stethoscope } from "lucide-react-native";
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
  approveAdminDoctorSpecialityChange,
  fetchAdminDoctorSpecialityChanges,
  rejectAdminDoctorSpecialityChange,
  type AdminDoctorSpecialityChangeRow,
} from "@/domains/admin/api";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminDoctorSpecialityChangesWeb() {
  const colors = useColors();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [items, setItems] = useState<AdminDoctorSpecialityChangeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setItems(await fetchAdminDoctorSpecialityChanges(accessToken));
    } catch (e) {
      showErrorToast("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id: string) => {
    if (!accessToken || busyId) return;
    setBusyId(id);
    try {
      await approveAdminDoctorSpecialityChange(accessToken, id);
      showSuccessToast("Approved", "Speciality change applied.");
      await load();
    } catch (e) {
      showErrorToast("Error", (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    if (!accessToken || busyId) return;
    setBusyId(id);
    try {
      await rejectAdminDoctorSpecialityChange(accessToken, id);
      showSuccessToast("Rejected", "Speciality change rejected.");
      await load();
    } catch (e) {
      showErrorToast("Error", (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell title="Doctor speciality changes">
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.empty, { borderColor: colors.border }]}>
          <Stethoscope size={28} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, marginTop: 8 }}>
            No pending speciality change requests.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((item) => (
            <View
              key={item.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.title, { color: colors.foreground }]}>
                {item.doctor_name}
              </Text>
              <Text style={{ color: colors.mutedForeground }}>{item.doctor_email}</Text>
              <Text style={[styles.change, { color: colors.foreground }]}>
                {item.current_speciality_name_en ?? "—"} → {item.requested_speciality_name_en}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                Requested {fmt(item.created_at)}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  disabled={busyId === item.id}
                  onPress={() => void approve(item.id)}
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.btnText}>Approve</Text>
                </Pressable>
                <Pressable
                  disabled={busyId === item.id}
                  onPress={() => void reject(item.id)}
                  style={[styles.btn, styles.rejectBtn]}
                >
                  <Text style={styles.btnText}>Reject</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  empty: {
    margin: 24,
    padding: 32,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
  },
  list: { padding: 24, gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  title: { fontSize: 16, fontWeight: "700" },
  change: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtn: { backgroundColor: "#dc2626" },
  btnText: { color: "#fff", fontWeight: "700" },
});
