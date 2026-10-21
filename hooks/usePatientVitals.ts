import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/domains/auth/store";
import {
  fetchMyPatientVitals,
  fetchPatientVitalsForUser,
  updateMyPatientVitals,
} from "@/domains/vitals/api";
import type { PatientRecentVitals, PatientVitalsUpdate } from "@/domains/vitals/types";
import { EMPTY_PATIENT_VITALS } from "@/domains/vitals/types";

type Options = {
  patientUserId?: string;
  /** When true, load another patient's vitals (doctor view). */
  readOnlyTarget?: boolean;
};

export function usePatientVitals(options: Options = {}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const profileId = useAuthStore((s) => s.profile?.id);
  const targetId = options.readOnlyTarget
    ? options.patientUserId
    : (options.patientUserId ?? profileId);
  const editable =
    !options.readOnlyTarget &&
    !!profileId &&
    !!targetId &&
    profileId === targetId;

  const [vitals, setVitals] = useState<PatientRecentVitals>(EMPTY_PATIENT_VITALS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!accessToken || !targetId) {
      setVitals(EMPTY_PATIENT_VITALS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = editable
        ? await fetchMyPatientVitals(accessToken)
        : await fetchPatientVitalsForUser(targetId, accessToken);
      setVitals(data);
    } catch (e) {
      setError((e as Error).message);
      setVitals(EMPTY_PATIENT_VITALS);
    } finally {
      setLoading(false);
    }
  }, [accessToken, targetId, editable, profileId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (payload: PatientVitalsUpdate) => {
      if (!accessToken || !editable) return;
      setSaving(true);
      setError(null);
      try {
        const next = await updateMyPatientVitals(accessToken, payload);
        setVitals(next);
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [accessToken, editable],
  );

  return {
    vitals,
    loading,
    saving,
    error,
    editable,
    reload,
    save,
  };
}
