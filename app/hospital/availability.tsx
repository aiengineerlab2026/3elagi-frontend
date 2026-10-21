import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { HospitalShell } from "@/components/hospital/HospitalShell";
import { Button, Chip, Field, Muted, Section, surgeryStyles } from "@/components/surgery/ui";
import {
  decideSlots,
  fetchAvailability,
  fetchHospitalOperations,
  saveMyHospitalOverrides,
  saveMyHospitalSlots,
  upcomingDates,
  type AvailabilityDay,
  type HospitalOverrideRow,
  type HospitalSlotRow,
  type SurgicalOperation,
} from "@/domains/surgery/api";
import { useMyHospital } from "@/domains/surgery/useMyHospital";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

const digits = (v: string) => Number(v.replace(/\D/g, "")) || 0;

/** Weekly slots per doctor + operation, plus date exceptions. */
export default function HospitalAvailability() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { token, hospital, setHospital, reload } = useMyHospital();
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [operations, setOperations] = useState<SurgicalOperation[]>([]);
  const [slots, setSlots] = useState<HospitalSlotRow[]>([]);
  const [overrides, setOverrides] = useState<HospitalOverrideRow[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [operationId, setOperationId] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingOverrides, setSavingOverrides] = useState(false);
  const [preview, setPreview] = useState<AvailabilityDay[] | null>(null);

  useEffect(() => {
    if (!token) return;
    void fetchHospitalOperations(token).then(setOperations).catch(() => setOperations([]));
  }, [token]);

  useEffect(() => {
    if (!hospital) return;
    // The editor owns approved windows; doctors' proposals are reviewed separately.
    // Weekly approved windows only; dated windows (doctor calendar proposals) are reviewed below.
    setSlots(hospital.slots.filter((s) => (s.status ?? "approved") === "approved" && !s.date));
    setOverrides(hospital.overrides);
  }, [hospital]);

  // Doctors assigned to at least one surgery (Surgeries page) — only they can have slots.
  const doctors = useMemo(
    () =>
      (hospital?.links ?? []).filter(
        (l) => l.status === "approved" && l.doctor && hospital?.surgeries.some((s) => s.doctor_ids.includes(l.doctor_id)),
      ),
    [hospital],
  );
  const doctor = doctors.find((l) => l.doctor_id === doctorId)?.doctor;

  // Only surgeries this doctor is assigned to here (the server enforces the same rule).
  const doctorOps = useMemo(() => {
    const ids = new Set(
      (hospital?.surgeries ?? []).filter((s) => s.doctor_ids.includes(doctorId)).map((s) => s.operation_id),
    );
    return operations.filter((o) => ids.has(o.id));
  }, [hospital, doctorId, operations]);

  const opName = (o?: SurgicalOperation) => (o ? (isRTL ? o.name_ar : o.name_en) : "");
  const opsById = useMemo(() => new Map(operations.map((o) => [o.id, o])), [operations]);
  const configuredOps = (id: string) => new Set(slots.filter((s) => s.doctor_id === id).map((s) => s.operation_id));

  // Preview what patients will see for the selected doctor + operation.
  const loadPreview = () => {
    setPreview(null);
    if (hospital && doctorId && operationId) {
      void fetchAvailability(hospital.id, operationId, doctorId, 14).then(setPreview).catch(() => setPreview([]));
    }
  };
  useEffect(loadPreview, [hospital, doctorId, operationId]);

  const update = (index: number, patch: Partial<HospitalSlotRow>) =>
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const save = async () => {
    setSaving(true);
    try {
      const saved = await saveMyHospitalSlots(token, slots);
      if (hospital) setHospital({ ...hospital, slots: saved });
      showSuccessToast(t.surgery.saved);
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const updateOverride = (index: number, patch: Partial<HospitalOverrideRow>) =>
    setOverrides((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));

  const saveOverrides = async () => {
    setSavingOverrides(true);
    try {
      const saved = await saveMyHospitalOverrides(token, overrides);
      if (hospital) setHospital({ ...hospital, overrides: saved });
      showSuccessToast(t.surgery.saved);
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    } finally {
      setSavingOverrides(false);
    }
  };

  // A doctor's calendar proposal is one row per date — group them so it's decided in one tap.
  const groupSlots = (rows: HospitalSlotRow[]) => {
    const groups = new Map<string, HospitalSlotRow[]>();
    for (const r of rows) {
      const key = [r.doctor_id, r.operation_id, r.start_time, r.end_time, r.slot_minutes].join("|");
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    return [...groups.entries()].map(([key, items]) => ({ key, items, first: items[0] }));
  };
  const proposals = groupSlots((hospital?.slots ?? []).filter((s) => s.status === "pending"));
  const approvedDated = groupSlots(
    (hospital?.slots ?? []).filter((s) => s.status === "approved" && s.date),
  );
  const whenLabel = (items: HospitalSlotRow[]) =>
    items.map((r) => r.date ?? t.surgery.days[r.day_of_week]).sort().join(", ");
  const doctorName = (id: string) => hospital?.links.find((l) => l.doctor_id === id)?.doctor?.name ?? "—";

  const decide = async (key: string, ids: string[], status: "approved" | "rejected") => {
    setDecidingId(key);
    try {
      await decideSlots(token, ids, status);
      await reload();
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    } finally {
      setDecidingId(null);
    }
  };

  const dayLabel = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return `${t.surgery.days[new Date(y, m - 1, day).getDay()]} ${day}/${m}`;
  };

  if (!hospital) {
    return (
      <HospitalShell title={t.surgery.availability} hospital={null}>
        <ActivityIndicator color={colors.primary} />
      </HospitalShell>
    );
  }

  return (
    <HospitalShell title={t.surgery.availability} subtitle={t.surgery.availabilitySubtitle} hospital={hospital}>
      {[
        { title: t.surgery.proposals, groups: proposals, pending: true },
        { title: t.surgery.approvedSlots, groups: approvedDated, pending: false },
      ].map(({ title, groups, pending }) =>
        groups.length === 0 ? null : (
          <Section key={title} title={`${title} (${groups.length})`}>
            {groups.map(({ key, items, first }) => (
              <View key={key} style={[surgeryStyles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }]}>
                <View style={{ flex: 1, minWidth: 220, gap: 2 }}>
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                    {doctorName(first.doctor_id)} · {opName(first.operation ?? opsById.get(first.operation_id))}
                  </Text>
                  <Muted>
                    {first.start_time.slice(0, 5)}–{first.end_time.slice(0, 5)} · {first.slot_minutes}′
                  </Muted>
                  <Muted>{whenLabel(items)}</Muted>
                </View>
                {pending ? (
                  <Button
                    label={t.surgery.approve}
                    busy={decidingId === key}
                    onPress={() => void decide(key, items.map((r) => r.id!), "approved")}
                  />
                ) : null}
                <Button
                  label={t.surgery.reject}
                  variant="danger"
                  disabled={decidingId === key}
                  onPress={() => void decide(key, items.map((r) => r.id!), "rejected")}
                />
              </View>
            ))}
          </Section>
        ),
      )}

      <Section title={t.surgery.doctor}>
        {doctors.length === 0 ? <Muted>{t.surgery.noSurgeriesYet}</Muted> : null}
        <View style={surgeryStyles.row}>
          {doctors.map((l) => (
            <Chip
              key={l.doctor_id}
              label={`${l.doctor!.name}${configuredOps(l.doctor_id).size ? ` · ${configuredOps(l.doctor_id).size}` : ""}`}
              active={doctorId === l.doctor_id}
              onPress={() => {
                setDoctorId(l.doctor_id);
                setOperationId("");
              }}
            />
          ))}
        </View>
      </Section>

      {doctor ? (
        <Section title={t.surgery.operation}>
          {doctorOps.length === 0 ? <Muted>{t.surgery.noOperationsForDoctor}</Muted> : null}
          <View style={surgeryStyles.row}>
            {doctorOps.map((o) => (
              <Chip
                key={o.id}
                label={`${opName(o)}${configuredOps(doctorId).has(o.id) ? " ✓" : ""}`}
                active={operationId === o.id}
                onPress={() => setOperationId(o.id)}
              />
            ))}
          </View>
        </Section>
      ) : null}

      {doctor && operationId ? (
        <Section title={`${doctor.name} · ${opName(opsById.get(operationId))}`}>
          {slots.map((s, i) =>
            s.doctor_id !== doctorId || s.operation_id !== operationId ? null : (
              <View key={i} style={{ gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
                <View style={surgeryStyles.row}>
                  {t.surgery.days.map((label, day) => (
                    <Chip key={day} label={label} active={s.day_of_week === day} onPress={() => update(i, { day_of_week: day })} />
                  ))}
                </View>
                <View style={surgeryStyles.row}>
                  <Field label={t.surgery.from} value={s.start_time.slice(0, 5)} placeholder="09:00" onChangeText={(v) => update(i, { start_time: v })} />
                  <Field label={t.surgery.to} value={s.end_time.slice(0, 5)} placeholder="15:00" onChangeText={(v) => update(i, { end_time: v })} />
                  <Field
                    label={t.surgery.slotMinutes}
                    value={String(s.slot_minutes)}
                    keyboardType="number-pad"
                    onChangeText={(v) => update(i, { slot_minutes: digits(v) })}
                  />
                  <Button label="✕" variant="outline" onPress={() => setSlots((prev) => prev.filter((_, j) => j !== i))} />
                </View>
              </View>
            ),
          )}
          <View style={surgeryStyles.row}>
            <Button
              label={t.surgery.addWindow}
              variant="outline"
              onPress={() =>
                setSlots((prev) => [
                  ...prev,
                  { doctor_id: doctorId, operation_id: operationId, day_of_week: 0, start_time: "09:00", end_time: "15:00", slot_minutes: 60 },
                ])
              }
            />
            <View style={{ flex: 1 }} />
            <Button
              label={t.common.save}
              busy={saving}
              onPress={() => void save()}
            />
          </View>

          <Muted>{t.surgery.next14Days}</Muted>
          {preview === null ? <ActivityIndicator color={colors.primary} /> : null}
          {preview && preview.every((d) => d.slots.length === 0) ? <Muted>{t.surgery.noAvailability}</Muted> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {preview
              ?.filter((d) => d.slots.length > 0)
              .map((d) => {
                const free = d.slots.filter((s) => !s.taken).length;
                return (
                  <View key={d.date} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 8, minWidth: 92 }}>
                    <Text style={{ color: colors.foreground, fontWeight: "700" }}>{dayLabel(d.date)}</Text>
                    <Muted>
                      {free}/{d.slots.length} {t.surgery.freeSlots}
                    </Muted>
                  </View>
                );
              })}
          </ScrollView>
        </Section>
      ) : null}

      <Section title={t.surgery.dateExceptions}>
        {overrides.map((o, i) => (
          <View key={i} style={{ gap: 8, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, paddingTop: i ? 10 : 0 }}>
            <View style={surgeryStyles.row}>
              <Chip label={t.surgery.allDoctors} active={!o.doctor_id} onPress={() => updateOverride(i, { doctor_id: null })} />
              {doctors.map((l) => (
                <Chip
                  key={l.doctor_id}
                  label={l.doctor!.name}
                  active={o.doctor_id === l.doctor_id}
                  onPress={() => updateOverride(i, { doctor_id: l.doctor_id })}
                />
              ))}
            </View>
            <View style={surgeryStyles.row}>
              <Chip label={t.surgery.allOperations} active={!o.operation_id} onPress={() => updateOverride(i, { operation_id: null })} />
              {[...new Set(slots.map((s) => s.operation_id))].map((id) => (
                <Chip key={id} label={opName(opsById.get(id))} active={o.operation_id === id} onPress={() => updateOverride(i, { operation_id: id })} />
              ))}
            </View>
            <View style={surgeryStyles.row}>
              <Field label={t.surgery.startDate} value={o.start_date} onChangeText={(v) => updateOverride(i, { start_date: v })} />
              <Field label={t.surgery.endDate} value={o.end_date} onChangeText={(v) => updateOverride(i, { end_date: v })} />
            </View>
            <View style={surgeryStyles.row}>
              <Chip label={t.surgery.closed} active={o.is_closed} onPress={() => updateOverride(i, { is_closed: true })} />
              <Chip
                label={t.surgery.customHours}
                active={!o.is_closed}
                onPress={() =>
                  updateOverride(i, {
                    is_closed: false,
                    start_time: o.start_time ?? "09:00",
                    end_time: o.end_time ?? "15:00",
                    slot_minutes: o.slot_minutes ?? 60,
                  })
                }
              />
            </View>
            {!o.is_closed ? (
              <View style={surgeryStyles.row}>
                <Field label={t.surgery.from} value={(o.start_time ?? "").slice(0, 5)} onChangeText={(v) => updateOverride(i, { start_time: v })} />
                <Field label={t.surgery.to} value={(o.end_time ?? "").slice(0, 5)} onChangeText={(v) => updateOverride(i, { end_time: v })} />
                <Field
                  label={t.surgery.slotMinutes}
                  value={String(o.slot_minutes ?? "")}
                  keyboardType="number-pad"
                  onChangeText={(v) => updateOverride(i, { slot_minutes: digits(v) })}
                />
              </View>
            ) : null}
            <View style={surgeryStyles.row}>
              <Field label={t.surgery.note} value={o.note ?? ""} onChangeText={(v) => updateOverride(i, { note: v })} />
              <Button label="✕" variant="outline" onPress={() => setOverrides((prev) => prev.filter((_, j) => j !== i))} />
            </View>
          </View>
        ))}
        <View style={surgeryStyles.row}>
          <Button
            label={t.surgery.addException}
            variant="outline"
            onPress={() => {
              const today = upcomingDates(1)[0];
              setOverrides((prev) => [
                ...prev,
                { operation_id: null, doctor_id: null, start_date: today, end_date: today, is_closed: true, note: "" },
              ]);
            }}
          />
          <View style={{ flex: 1 }} />
          <Button label={t.common.save} busy={savingOverrides} onPress={() => void saveOverrides()} />
        </View>
      </Section>
    </HospitalShell>
  );
}
