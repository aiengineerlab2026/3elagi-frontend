import { useFocusEffect } from "@react-navigation/native";
import { Redirect, router } from "expo-router";
import { ChevronLeft, ChevronRight, MessageSquare, Users } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { PatientSearchFilterPanel } from "@/components/PatientSearchFilterPanel";
import {
  EMPTY_PATIENT_FILTERS,
  type PatientSearchFilters,
} from "@/domains/patients/search";
import {
  fetchMyConsultations,
  type DoctorConsultation,
} from "@/domains/consultations/api";
import { fetchDemoPatient, type DemoPatientInfo } from "@/domains/doctor/testPatientChatApi";
import { ensureDoctorOnboarding } from "@/domains/onboarding/doctorTourApi";
import { useProductTourStore } from "@/domains/onboarding/productTourStore";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { showErrorToast } from "@/utils/toast";
import { alignText, flexRow, localeTag } from "@/utils/rtl";

type ConsultationPatientRow = {
  patient_id: string;
  patient_name: string;
  last_at: string;
  open_count: number;
  total_count: number;
  is_demo?: boolean;
};

function mergeDemoPatientRow(
  rows: ConsultationPatientRow[],
  demo: DemoPatientInfo | null,
): ConsultationPatientRow[] {
  const demoId = demo?.patient_user_id;
  if (!demoId) return rows;

  const rest = rows.filter((row) => row.patient_id !== demoId);
  const existing = rows.find((row) => row.patient_id === demoId);
  const demoRow: ConsultationPatientRow = existing
    ? { ...existing, is_demo: true }
    : {
        patient_id: demoId,
        patient_name: demo.display_name ?? "Demo Patient",
        last_at: new Date().toISOString(),
        open_count: 0,
        total_count: 0,
        is_demo: true,
      };

  return [demoRow, ...rest];
}

function dedupeConsultationPatients(
  items: DoctorConsultation[],
): ConsultationPatientRow[] {
  const map = new Map<string, ConsultationPatientRow>();
  for (const c of items) {
    const existing = map.get(c.patient_id);
    if (!existing) {
      map.set(c.patient_id, {
        patient_id: c.patient_id,
        patient_name: c.patient_name || "Patient",
        last_at: c.created_at,
        open_count: c.status === "open" ? 1 : 0,
        total_count: 1,
      });
      continue;
    }
    existing.total_count += 1;
    if (c.status === "open") existing.open_count += 1;
    if (new Date(c.created_at).getTime() > new Date(existing.last_at).getTime()) {
      existing.last_at = c.created_at;
      if (c.patient_name) existing.patient_name = c.patient_name;
    }
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime(),
  );
}

/** Doctor Patients tab — patients who started a consultation with this doctor. */
export default function PatientsTab() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const role = useAuthStore((s) => s.role);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isDoctor = role?.toLowerCase() === "doctor";
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  const [rows, setRows] = useState<ConsultationPatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<PatientSearchFilters>(EMPTY_PATIENT_FILTERS);

  const setTestPatientUserId = useProductTourStore((s) => s.setTestPatientUserId);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const demoId = await ensureDoctorOnboarding(accessToken).catch(() => null);
      const [list, demo] = await Promise.all([
        fetchMyConsultations(accessToken),
        fetchDemoPatient(accessToken).catch(() => null),
      ]);
      const resolvedDemo: DemoPatientInfo | null =
        demo ??
        (demoId
          ? { patient_user_id: demoId, chat_open: true, display_name: "Demo Patient" }
          : null);
      if (resolvedDemo?.patient_user_id) {
        setTestPatientUserId(resolvedDemo.patient_user_id);
      }
      setRows(mergeDemoPatientRow(dedupeConsultationPatients(list), resolvedDemo));
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, setTestPatientUserId, t.common.error]);

  useFocusEffect(
    useCallback(() => {
      if (!isDoctor) return;
      void load();
    }, [isDoctor, load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const q = filters.text.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.patient_name.toLowerCase().includes(q));
  }, [rows, filters.text]);

  if (!isDoctor) return <Redirect href="/(tabs)" />;

  const openPatient = (row: ConsultationPatientRow) => {
    router.push({
      pathname: "/patients/[userId]",
      params: { userId: row.patient_id, name: row.patient_name },
    });
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(localeTag(isRTL), {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
          {t.patients.title}
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground, textAlign }]}>
          {t.patients.consultationPatientsSub}
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <PatientSearchFilterPanel
          filters={filters}
          onChange={setFilters}
          isRTL={isRTL}
          dir={dir}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.patient_id}
          contentContainerStyle={
            filtered.length === 0 ? styles.emptyList : styles.list
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Users size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {t.patients.noPatientsYet}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {t.patients.noPatientsYetSub}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openPatient(item)}
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  flexDirection: dir,
                },
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: `${colors.primary}18` },
                ]}
              >
                <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 16 }}>
                  {(item.patient_name || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <Text
                  style={[styles.name, { color: colors.foreground, textAlign }]}
                  numberOfLines={1}
                >
                  {item.patient_name}
                </Text>
                <View style={[styles.metaRow, { flexDirection: dir }]}>
                  <MessageSquare size={12} color={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                    {item.is_demo
                      ? isRTL
                        ? "مريض تجريبي (ذكاء اصطناعي)"
                        : "AI demo patient"
                      : item.open_count > 0
                        ? t.patients.openConsultations(item.open_count)
                        : t.patients.consultationCount(item.total_count)}
                  </Text>
                </View>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign }}>
                  {t.patients.lastVisit} {formatDate(item.last_at)}
                </Text>
              </View>
              <Chevron size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 4,
  },
  title: { fontSize: 20, fontWeight: "800" },
  sub: { fontSize: 13, lineHeight: 18 },
  searchWrap: { paddingHorizontal: 12, paddingVertical: 8 },
  list: { paddingHorizontal: 12, paddingBottom: 24, gap: 8 },
  emptyList: { flexGrow: 1, justifyContent: "center", padding: 24 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800", marginTop: 8 },
  emptySub: { fontSize: 13, textAlign: "center", maxWidth: 280 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 2, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "800" },
  metaRow: { alignItems: "center", gap: 4 },
});
