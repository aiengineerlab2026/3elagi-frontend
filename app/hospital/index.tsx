import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { HospitalShell } from "@/components/hospital/HospitalShell";
import { ApprovalLine, Button, Chip, Muted, Section, StatusBadge, surgeryStyles, useStatusLabel } from "@/components/surgery/ui";
import {
  decideReservation,
  fetchHospitalReservations,
  type ReservationStatus,
  type SurgeryReservation,
} from "@/domains/surgery/api";
import { useMyHospital } from "@/domains/surgery/useMyHospital";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { showErrorToast } from "@/utils/toast";

const FILTERS: (ReservationStatus | "all")[] = ["pending", "approved", "rejected", "cancelled", "all"];

/** Hospital home: surgery bookings to approve or reject. */
export default function HospitalReservations() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const statusLabel = useStatusLabel();
  const { token, hospital } = useMyHospital();
  const [rows, setRows] = useState<SurgeryReservation[] | null>(null);
  const [filter, setFilter] = useState<ReservationStatus | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setRows(await fetchHospitalReservations(token));
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
      setRows([]);
    }
  }, [token, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    try {
      const saved = await decideReservation(token, id, status);
      setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, ...saved } : r)) ?? null);
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const count = (s: ReservationStatus) => rows?.filter((r) => r.status === s).length ?? 0;
  const visible = (rows ?? []).filter((r) => filter === "all" || r.status === filter);

  return (
    <HospitalShell title={t.surgery.reservations} subtitle={t.surgery.hospitalReservationsSubtitle} hospital={hospital}>
      <View style={surgeryStyles.row}>
        {FILTERS.map((f) => (
          <Chip
            key={f}
            label={f === "all" ? t.surgery.all : `${statusLabel(f)} (${count(f)})`}
            active={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
        <View style={{ flex: 1 }} />
        <Button label="↻" variant="outline" onPress={() => void load()} />
      </View>

      {rows === null ? <ActivityIndicator color={colors.primary} /> : null}
      {rows !== null && visible.length === 0 ? <Muted>{t.surgery.noReservations}</Muted> : null}

      {visible.map((r) => (
        <Section key={r.id}>
          <View style={surgeryStyles.row}>
            <Text style={{ flex: 1, fontWeight: "800", color: colors.foreground }}>
              {r.date} · {r.time.slice(0, 5)}
            </Text>
            <StatusBadge status={r.status} label={statusLabel(r.status)} />
          </View>
          <Text style={{ color: colors.foreground, fontWeight: "600" }}>
            {isRTL ? r.operation?.name_ar : r.operation?.name_en}
          </Text>
          <Muted>
            {t.surgery.doctor}: {r.doctor?.name ?? "—"}
          </Muted>
          <Muted>
            {t.surgery.patient}: {[r.patient_name, r.patient_phone].filter(Boolean).join(" · ") || "—"}
          </Muted>
          {r.notes ? <Muted>{r.notes}</Muted> : null}
          <ApprovalLine r={r} />
          {r.status === "pending" && r.hospital_status === "pending" ? (
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
    </HospitalShell>
  );
}
