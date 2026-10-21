import React, { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { HospitalShell } from "@/components/hospital/HospitalShell";
import { Button, Field, Section } from "@/components/surgery/ui";
import { updateMyHospital } from "@/domains/surgery/api";
import { useMyHospital } from "@/domains/surgery/useMyHospital";
import { useI18n } from "@/hooks/useI18n";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

/** Hospital name / location / description / phone shown to patients. */
export default function HospitalProfile() {
  const { t } = useI18n();
  const { token, hospital, setHospital } = useMyHospital();
  const [info, setInfo] = useState({ name: "", location: "", description: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hospital) {
      setInfo({
        name: hospital.name,
        location: hospital.location,
        description: hospital.description,
        phone: hospital.phone,
      });
    }
  }, [hospital]);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await updateMyHospital(token, info);
      if (hospital) setHospital({ ...hospital, ...saved });
      showSuccessToast(t.surgery.saved);
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <HospitalShell title={t.surgery.hospitalProfile} subtitle={t.surgery.profileSubtitle} hospital={hospital}>
      {!hospital ? (
        <ActivityIndicator />
      ) : (
        <Section>
          <Field label={t.surgery.hospitalName} value={info.name} onChangeText={(name) => setInfo((s) => ({ ...s, name }))} />
          <Field label={t.surgery.location} value={info.location} onChangeText={(location) => setInfo((s) => ({ ...s, location }))} />
          <Field label={t.auth.phone} value={info.phone} onChangeText={(phone) => setInfo((s) => ({ ...s, phone }))} />
          <Field
            label={t.surgery.description}
            multiline
            value={info.description}
            onChangeText={(description) => setInfo((s) => ({ ...s, description }))}
          />
          <Button label={t.common.save} busy={saving} onPress={() => void save()} />
        </Section>
      )}
    </HospitalShell>
  );
}
