import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { HospitalShell } from "@/components/hospital/HospitalShell";
import { Button, Chip, Field, Muted, Section, surgeryStyles } from "@/components/surgery/ui";
import { fetchSpecialities, type Speciality } from "@/domains/home/api";
import {
  createHospitalOperation,
  fetchHospitalOperations,
  removeHospitalSurgery,
  setHospitalSurgery,
  type HospitalLink,
  type SurgicalOperation,
} from "@/domains/surgery/api";
import { useMyHospital } from "@/domains/surgery/useMyHospital";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

/** Custom surgery names are English only (same rule as the server). */
const ENGLISH_NAME = /^[A-Za-z0-9 ()&/,.'+-]+$/;

/** Doctor practises the speciality (primary or extra). */
function practises(link: HospitalLink, specialityId: string) {
  const d = link.doctor;
  return d?.speciality?.id === specialityId || !!d?.specialities?.some((s) => s.id === specialityId);
}

/** Surgeries the hospital offers: speciality → surgery → one or more doctors. */
export default function HospitalSurgeries() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { token, hospital, reload } = useMyHospital();
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [operations, setOperations] = useState<SurgicalOperation[]>([]);
  const [specialityId, setSpecialityId] = useState("");
  const [operationId, setOperationId] = useState("");
  const [doctorIds, setDoctorIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [customEn, setCustomEn] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  useEffect(() => {
    void fetchSpecialities().then(setSpecialities).catch(() => setSpecialities([]));
  }, []);

  useEffect(() => {
    if (!token) return;
    void fetchHospitalOperations(token).then(setOperations).catch(() => setOperations([]));
  }, [token]);

  /** Surgery not in the list → add it as this hospital's own and select it. */
  const addCustom = async () => {
    if (customEn.trim().length < 2 || !ENGLISH_NAME.test(customEn.trim())) return;
    setAddingCustom(true);
    try {
      const op = await createHospitalOperation(token, {
        speciality_id: specialityId,
        name_en: customEn.trim(),
      });
      setOperations((prev) => (prev.some((o) => o.id === op.id) ? prev : [...prev, op]));
      pickOperation(op.id);
      setCustomEn("");
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    } finally {
      setAddingCustom(false);
    }
  };

  const surgeries = hospital?.surgeries ?? [];
  const offered = (id: string) => surgeries.find((s) => s.operation_id === id);
  const linked = useMemo(() => (hospital?.links ?? []).filter((l) => l.status === "approved"), [hospital]);
  const eligible = specialityId ? linked.filter((l) => practises(l, specialityId)) : [];
  const opsForSpeciality = operations.filter((o) => o.speciality_id === specialityId);

  const opName = (o?: SurgicalOperation) => (o ? (isRTL ? o.name_ar : o.name_en) : "");
  const specName = (o?: SurgicalOperation) =>
    o?.speciality ? (isRTL ? o.speciality.name_ar : o.speciality.name_en) : "";
  const doctorName = (id: string) => linked.find((l) => l.doctor_id === id)?.doctor?.name ?? "—";

  const reset = () => {
    setOperationId("");
    setDoctorIds([]);
  };

  const pickOperation = (id: string) => {
    setOperationId(id);
    setDoctorIds(offered(id)?.doctor_ids ?? []);
  };

  const edit = (operationIdToEdit: string) => {
    const op = operations.find((o) => o.id === operationIdToEdit);
    if (op) setSpecialityId(op.speciality_id);
    pickOperation(operationIdToEdit);
  };

  const toggleDoctor = (id: string) =>
    setDoctorIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));

  const save = async () => {
    setSaving(true);
    try {
      await setHospitalSurgery(token, operationId, doctorIds);
      await reload();
      showSuccessToast(t.surgery.saved);
      reset();
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await removeHospitalSurgery(token, id);
      await reload();
      if (operationId === id) reset();
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    }
  };

  return (
    <HospitalShell title={t.surgery.surgeriesOffered} subtitle={t.surgery.hospitalSurgeriesSubtitle} hospital={hospital}>
      <Section title={operationId && offered(operationId) ? t.surgery.editSurgery : t.surgery.addSurgery}>
        <Muted>{t.surgery.speciality}</Muted>
        <View style={surgeryStyles.row}>
          {specialities.map((s) => (
            <Chip
              key={s.id}
              label={isRTL ? s.nameAr : s.nameEn}
              active={specialityId === s.id}
              onPress={() => {
                setSpecialityId(s.id);
                reset();
              }}
            />
          ))}
        </View>

        {specialityId ? (
          <>
            <Muted>{t.surgery.operation}</Muted>
            {opsForSpeciality.length === 0 ? <Muted>{t.surgery.noOperations}</Muted> : null}
            <View style={surgeryStyles.row}>
              {opsForSpeciality.map((o) => (
                <Chip
                  key={o.id}
                  label={`${opName(o)}${offered(o.id) ? " ✓" : ""}`}
                  active={operationId === o.id}
                  onPress={() => pickOperation(o.id)}
                />
              ))}
            </View>
            <Muted>{t.surgery.otherSurgery}</Muted>
            <View style={surgeryStyles.row}>
              <Field
                label={t.surgery.customSurgeryName}
                value={customEn}
                onChangeText={setCustomEn}
                autoCapitalize="words"
                placeholder="e.g. Rhinoplasty"
              />
              <Button
                label={t.surgery.addCustom}
                variant="outline"
                busy={addingCustom}
                disabled={!ENGLISH_NAME.test(customEn.trim()) || customEn.trim().length < 2}
                onPress={() => void addCustom()}
              />
            </View>
          </>
        ) : null}

        {operationId ? (
          <>
            <Muted>{t.surgery.doctorsWhoPerform}</Muted>
            {eligible.length === 0 ? <Muted>{t.surgery.noEligibleDoctors}</Muted> : null}
            <View style={surgeryStyles.row}>
              {eligible.map((l) => (
                <Chip
                  key={l.doctor_id}
                  label={`${doctorIds.includes(l.doctor_id) ? "✓ " : ""}${l.doctor?.name ?? ""}`}
                  active={doctorIds.includes(l.doctor_id)}
                  onPress={() => toggleDoctor(l.doctor_id)}
                />
              ))}
            </View>
            <View style={surgeryStyles.row}>
              <Button label={t.common.cancel} variant="outline" onPress={reset} />
              <View style={{ flex: 1 }} />
              <Button label={t.common.save} busy={saving} onPress={() => void save()} />
            </View>
          </>
        ) : null}
      </Section>

      <Section title={`${t.surgery.surgeriesOffered} (${surgeries.length})`}>
        {!hospital ? <ActivityIndicator color={colors.primary} /> : null}
        {hospital && surgeries.length === 0 ? <Muted>{t.surgery.noSurgeriesYet}</Muted> : null}
        {surgeries.map((s) => (
          <View key={s.operation_id} style={[surgeryStyles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }]}>
            <View style={{ flex: 1, minWidth: 200, gap: 2 }}>
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                {opName(s.operation)}
                {specName(s.operation) ? ` · ${specName(s.operation)}` : ""}
              </Text>
              <Muted>{s.doctor_ids.length ? s.doctor_ids.map(doctorName).join(", ") : "—"}</Muted>
            </View>
            <Button label={t.surgery.edit} variant="outline" onPress={() => edit(s.operation_id)} />
            <Button label={t.surgery.remove} variant="danger" onPress={() => void remove(s.operation_id)} />
          </View>
        ))}
      </Section>
    </HospitalShell>
  );
}
