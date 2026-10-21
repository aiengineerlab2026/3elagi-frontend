import { Redirect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { ApprovalLine, Button, Muted, Section, StatusBadge, surgeryStyles } from "@/components/surgery/ui";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import {
  doctorDecideReservation,
  fetchDoctorReservations,
  type ReservationStatus,
  type SurgeryReservation,
} from "@/domains/surgery/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { showErrorToast } from "@/utils/toast";

/** Doctor view: surgeries booked with this doctor (invitations live in the Hospitals tab). */
export default function SurgeriesScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const token = useAuthStore((s) => s.accessToken);
  const [rows, setRows] = useState<SurgeryReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const decide = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    try {
      const saved = await doctorDecideReservation(token!, id, status);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...saved } : r)));
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setRows(await fetchDoctorReservations(token));
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isSignedIn(profile, token)) return <Redirect href="/welcome" />;

  const statusLabel = (s: ReservationStatus) =>
    ({
      pending: t.surgery.statusPending,
      approved: t.surgery.statusApproved,
      rejected: t.surgery.statusRejected,
      cancelled: t.surgery.statusCancelled,
    })[s];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={surgeryStyles.page}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      >
        <View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>{t.surgery.surgeries}</Text>
          <Muted>{t.surgery.surgeriesSubtitle}</Muted>
        </View>


        {!loading && rows.length === 0 ? <Muted>{t.surgery.noReservations}</Muted> : null}
        {rows.map((r) => (
          <Section key={r.id}>
            <View style={surgeryStyles.row}>
              <Text style={{ flex: 1, fontWeight: "800", color: colors.foreground }}>
                {r.date} · {r.time.slice(0, 5)}
              </Text>
              <StatusBadge status={r.status} label={statusLabel(r.status)} />
            </View>
            <Text style={{ color: colors.foreground }}>
              {isRTL ? r.operation?.name_ar : r.operation?.name_en}
            </Text>
            <Muted>
              {t.surgery.hospitalLabel}: {r.hospital?.name ?? "—"}
            </Muted>
            <Muted>
              {t.surgery.patient}: {[r.patient_name, r.patient_phone].filter(Boolean).join(" · ") || "—"}
            </Muted>
            {r.notes ? <Muted>{r.notes}</Muted> : null}
            <ApprovalLine r={r} />
            {r.status === "pending" && r.doctor_status === "pending" ? (
              <View style={surgeryStyles.row}>
                <Button label={t.surgery.approve} busy={busyId === r.id} onPress={() => void decide(r.id, "approved")} />
                <Button
                  label={t.surgery.reject}
                  variant="danger"
                  disabled={busyId === r.id}
                  onPress={() => void decide(r.id, "rejected")}
                />
              </View>
            ) : null}
          </Section>
        ))}
      </ScrollView>
    </View>
  );
}
