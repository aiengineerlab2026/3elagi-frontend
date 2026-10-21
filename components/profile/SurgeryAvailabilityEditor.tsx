import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { DoctorAvailabilityEditor } from "@/components/DoctorAvailabilityEditor";
import { Button, Chip, Muted, StatusBadge, surgeryStyles, useStatusLabel } from "@/components/surgery/ui";
import {
  deleteDoctorProposal,
  fetchDoctorLinks,
  fetchDoctorSlots,
  fetchDoctorSurgeries,
  proposeDoctorSlots,
  type HospitalLink,
  type HospitalSlotRow,
  type SurgicalOperation,
} from "@/domains/surgery/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { showErrorToast } from "@/utils/toast";

const SLOT_LENGTHS = [30, 60, 90, 120, 180, 240];

/**
 * Doctor proposes surgery time at a hospital with the same calendar as the
 * meeting schedule; each picked day becomes a pending window the hospital approves.
 */
export function SurgeryAvailabilityEditor({ token, isRTL }: { token: string; isRTL: boolean }) {
  const colors = useColors();
  const { t } = useI18n();
  const statusLabel = useStatusLabel();
  const [links, setLinks] = useState<HospitalLink[] | null>(null);
  // Surgeries this doctor is assigned to at the selected hospital.
  const [doctorOps, setDoctorOps] = useState<SurgicalOperation[]>([]);
  const [hospitalId, setHospitalId] = useState("");
  const [operationId, setOperationId] = useState("");
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [rows, setRows] = useState<HospitalSlotRow[]>([]);

  useEffect(() => {
    void fetchDoctorLinks(token)
      .then((l) => {
        const joined = l.filter((x) => x.status === "approved");
        setLinks(joined);
        if (joined.length === 1) setHospitalId(joined[0].hospital_id);
      })
      .catch(() => setLinks([]));
  }, [token]);

  useEffect(() => {
    setDoctorOps([]);
    if (hospitalId) {
      void fetchDoctorSurgeries(token, hospitalId).then(setDoctorOps).catch(() => setDoctorOps([]));
    }
  }, [token, hospitalId]);

  const loadRows = useCallback(() => {
    if (!hospitalId) return setRows([]);
    void fetchDoctorSlots(token, hospitalId).then(setRows).catch(() => setRows([]));
  }, [token, hospitalId]);
  useEffect(loadRows, [loadRows]);

  const link = links?.find((l) => l.hospital_id === hospitalId);
  useEffect(() => {
    if (doctorOps.length === 1) setOperationId(doctorOps[0].id);
    else if (!doctorOps.some((o) => o.id === operationId)) setOperationId("");
  }, [doctorOps, operationId]);

  const forOp = useMemo(
    () => rows.filter((r) => r.operation_id === operationId && r.date),
    [rows, operationId],
  );
  const approvedDates = useMemo(
    () => new Set(forOp.filter((r) => r.status === "approved").map((r) => r.date!)),
    [forOp],
  );
  const pendingDates = useMemo(
    () => new Set(forOp.filter((r) => r.status === "pending").map((r) => r.date!)),
    [forOp],
  );
  const opName = (o?: SurgicalOperation) => (o ? (isRTL ? o.name_ar : o.name_en) : "");

  if (links === null) return <ActivityIndicator color={colors.primary} />;
  if (links.length === 0) return <Muted>{t.surgery.noHospitalsYet}</Muted>;

  const header = (
    <View style={{ gap: 10 }}>
      <Muted>{t.surgery.hospitalLabel}</Muted>
      <View style={surgeryStyles.row}>
        {links.map((l) => (
          <Chip
            key={l.hospital_id}
            label={l.hospital?.name ?? ""}
            active={hospitalId === l.hospital_id}
            onPress={() => setHospitalId(l.hospital_id)}
          />
        ))}
      </View>
      {hospitalId ? (
        <>
          <Muted>{t.surgery.operation}</Muted>
          {doctorOps.length === 0 ? <Muted>{t.surgery.notAssigned}</Muted> : null}
          <View style={surgeryStyles.row}>
            {doctorOps.map((o) => (
              <Chip key={o.id} label={opName(o)} active={operationId === o.id} onPress={() => setOperationId(o.id)} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );

  const footer = (
    <View style={{ gap: 6 }}>
      <Muted>{t.surgery.slotMinutes}</Muted>
      <View style={surgeryStyles.row}>
        {SLOT_LENGTHS.map((m) => (
          <Chip key={m} label={`${m}′`} active={slotMinutes === m} onPress={() => setSlotMinutes(m)} />
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ gap: 16 }}>
      <DoctorAvailabilityEditor
        isRTL={isRTL}
        token={token}
        embedded
        variant="weekly"
        custom={{
          header,
          footer,
          markedDates: approvedDates,
          bookedDates: pendingDates,
          legend: { marked: t.surgery.statusApproved, booked: t.surgery.statusPending },
          saveLabel: t.surgery.sendForApproval,
          disabled: !hospitalId || !operationId,
          onSave: async (dates, from, to) => {
            await proposeDoctorSlots(
              token,
              hospitalId,
              dates.map((date) => ({
                operation_id: operationId,
                date,
                start_time: from,
                end_time: to,
                slot_minutes: slotMinutes,
              })),
            );
            loadRows();
            return t.surgery.proposalsSent;
          },
        }}
      />

      {forOp.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.foreground, fontWeight: "800" }}>
            {link?.hospital?.name} · {opName(doctorOps.find((o) => o.id === operationId))}
          </Text>
          {forOp.map((r) => (
            <View key={r.id} style={surgeryStyles.row}>
              <Text style={{ flex: 1, color: colors.foreground }}>
                {r.date} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} · {r.slot_minutes}′
              </Text>
              {r.status ? <StatusBadge status={r.status} label={statusLabel(r.status)} /> : null}
              {r.status !== "approved" ? (
                <Button
                  label="✕"
                  variant="outline"
                  onPress={() =>
                    void deleteDoctorProposal(token, hospitalId, r.id!)
                      .then(loadRows)
                      .catch((e) => showErrorToast(t.common.error, (e as Error).message))
                  }
                />
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
