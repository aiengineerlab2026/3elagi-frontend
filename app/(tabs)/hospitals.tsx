import { Redirect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import {
  Button,
  Muted,
  Section,
  StatusBadge,
  surgeryStyles,
  useStatusLabel,
} from "@/components/surgery/ui";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import {
  deleteDoctorProposal,
  fetchDoctorLinks,
  fetchDoctorSlots,
  fetchOperations,
  respondToLink,
  type HospitalLink,
  type HospitalSlotRow,
  type SurgicalOperation,
} from "@/domains/surgery/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { showErrorToast } from "@/utils/toast";

/** Doctor view: hospital invitations + the surgery slots offered at each hospital. */
export default function DoctorHospitalsScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const statusLabel = useStatusLabel();
  const profile = useAuthStore((s) => s.profile);
  const token = useAuthStore((s) => s.accessToken);
  const [links, setLinks] = useState<HospitalLink[] | null>(null);
  const [operations, setOperations] = useState<SurgicalOperation[]>([]);
  const router = useRouter();

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLinks(await fetchDoctorLinks(token));
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
      setLinks([]);
    }
  }, [token, t]);

  useEffect(() => {
    void load();
    void fetchOperations().then(setOperations).catch(() => setOperations([]));
  }, [load]);

  if (!isSignedIn(profile, token)) return <Redirect href="/welcome" />;

  const respond = async (hospitalId: string, status: "approved" | "rejected") => {
    try {
      await respondToLink(token!, hospitalId, status);
      await load();
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    }
  };

  const invitations = (links ?? []).filter((l) => l.status !== "approved");
  const joined = (links ?? []).filter((l) => l.status === "approved");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={surgeryStyles.page}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={links === null} onRefresh={() => void load()} />}
      >
        <View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground }}>{t.tabs.hospitals}</Text>
          <Muted>{t.surgery.doctorHospitalsSubtitle}</Muted>
        </View>

        <Section title={t.surgery.hospitalRequests}>
          {links !== null && invitations.length === 0 ? <Muted>{t.surgery.noHospitalRequests}</Muted> : null}
          {invitations.map((l) => (
            <View key={l.hospital_id} style={surgeryStyles.row}>
              <View style={{ flex: 1, minWidth: 160 }}>
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>{l.hospital?.name}</Text>
                {l.hospital?.location ? <Muted>{l.hospital.location}</Muted> : null}
              </View>
              <StatusBadge status={l.status} label={statusLabel(l.status)} />
              <Button label={t.surgery.accept} onPress={() => void respond(l.hospital_id, "approved")} />
              {l.status === "pending" ? (
                <Button
                  label={t.surgery.decline}
                  variant="outline"
                  onPress={() => void respond(l.hospital_id, "rejected")}
                />
              ) : null}
            </View>
          ))}
        </Section>

        {links === null ? <ActivityIndicator color={colors.primary} /> : null}
        {links !== null && joined.length === 0 ? <Muted>{t.surgery.noHospitalsYet}</Muted> : null}
        {joined.map((l) => (
          <Section
            key={l.hospital_id}
            title={l.hospital?.name}
            right={
              <View style={surgeryStyles.row}>
                <Button
                  label={t.surgery.proposeSlots}
                  onPress={() => router.push({ pathname: "/(tabs)/profile", params: { tab: "surgery" } })}
                />
                <Button label={t.surgery.decline} variant="outline" onPress={() => void respond(l.hospital_id, "rejected")} />
              </View>
            }
          >
            {l.hospital?.location ? <Muted>{l.hospital.location}</Muted> : null}
            <HospitalSlotsList token={token!} hospitalId={l.hospital_id} operations={operations} />
          </Section>
        ))}
      </ScrollView>
    </View>
  );
}

/** Read-only view of the doctor's windows at a hospital; proposals are made in Profile. */
function HospitalSlotsList({
  token,
  hospitalId,
  operations,
}: {
  token: string;
  hospitalId: string;
  operations: SurgicalOperation[];
}) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const statusLabel = useStatusLabel();
  const [rows, setRows] = useState<HospitalSlotRow[] | null>(null);

  const load = useCallback(() => {
    void fetchDoctorSlots(token, hospitalId).then(setRows).catch(() => setRows([]));
  }, [token, hospitalId]);
  useEffect(load, [load]);

  const opName = (id: string) => {
    const o = operations.find((x) => x.id === id);
    return o ? (isRTL ? o.name_ar : o.name_en) : "";
  };

  if (rows === null) return <ActivityIndicator color={colors.primary} />;
  if (rows.length === 0) return <Muted>{t.surgery.noApprovedSlots}</Muted>;

  return (
    <View style={{ gap: 6 }}>
      {rows.map((r) => (
        <View key={r.id} style={surgeryStyles.row}>
          <Text style={{ flex: 1, color: colors.foreground }}>
            {opName(r.operation_id)} · {r.date ?? t.surgery.days[r.day_of_week]} · {r.start_time.slice(0, 5)}–
            {r.end_time.slice(0, 5)} · {r.slot_minutes}′
          </Text>
          {r.status ? <StatusBadge status={r.status} label={statusLabel(r.status)} /> : null}
          {r.status !== "approved" ? (
            <Button
              label="✕"
              variant="outline"
              onPress={() =>
                void deleteDoctorProposal(token, hospitalId, r.id!)
                  .then(load)
                  .catch((e) => showErrorToast(t.common.error, (e as Error).message))
              }
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}
