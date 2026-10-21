import { useEffect, useState } from "react";
import { useAuthStore } from "@/domains/auth/store";
import {
  fetchDiagnosisById,
  fetchDoctorDiagnosisById,
  fetchDocumentsForPatientUser,
  fetchPatientDocuments,
  fetchPrescriptionById,
  findDoctorRecordById,
} from "@/domains/medical/api";
import type { MedicalRecord } from "@/domains/medical/types";
import { fetchIntakeExamInstance, mapInstance } from "@/domains/intake-exams/api";

type Options = {
  doctorView?: boolean;
  patientUserId?: string;
};

async function loadMedicalRecordPreviewDetail(
  record: MedicalRecord,
  accessToken: string,
  opts: Options & { profileId?: string; isDoctorRole: boolean },
): Promise<MedicalRecord> {
  const { id, category } = record;

  if (category === "intake") {
    const raw = await fetchIntakeExamInstance(id, accessToken);
    return mapInstance(raw);
  }

  if (opts.doctorView && opts.patientUserId) {
    if (category === "prescription") {
      return fetchPrescriptionById(id, opts.patientUserId, accessToken);
    }
    try {
      return await fetchDoctorDiagnosisById(id, accessToken);
    } catch {
      const docs = await fetchDocumentsForPatientUser(opts.patientUserId, accessToken);
      const doc = docs.find((row) => row.id === id);
      if (doc) return doc;
      return fetchPrescriptionById(id, opts.patientUserId, accessToken);
    }
  }

  if (opts.isDoctorRole) {
    try {
      return await fetchDoctorDiagnosisById(id, accessToken);
    } catch {
      const found = await findDoctorRecordById(id, accessToken);
      if (found) return found;
    }
  }

  if (category === "prescription" && opts.profileId) {
    return fetchPrescriptionById(id, opts.profileId, accessToken);
  }

  if (category === "lab" || category === "xray") {
    return record;
  }

  try {
    return await fetchDiagnosisById(id, accessToken);
  } catch {
    if (!opts.profileId) return record;
    const docs = await fetchPatientDocuments(opts.profileId, accessToken);
    const doc = docs.find((row) => row.id === id);
    if (doc) return doc;
    if (category === "prescription") {
      return fetchPrescriptionById(id, opts.profileId, accessToken);
    }
    return record;
  }
}

export function useMedicalRecordPreviewDetail(
  record: MedicalRecord | null,
  options: Options = {},
) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const profileId = useAuthStore((s) => s.profile?.id);
  const role = useAuthStore((s) => s.role);
  const isDoctorRole = role?.toLowerCase() === "doctor";

  const [detail, setDetail] = useState<MedicalRecord | null>(record);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!record) {
      setDetail(null);
      setLoading(false);
      return;
    }

    setDetail(record);

    if (!accessToken) return;

    let cancelled = false;
    setLoading(true);

    void loadMedicalRecordPreviewDetail(record, accessToken, {
      ...options,
      profileId,
      isDoctorRole,
    })
      .then((loaded) => {
        if (!cancelled) setDetail(loaded);
      })
      .catch(() => {
        if (!cancelled) setDetail(record);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [record?.id, record?.category, accessToken, profileId, isDoctorRole, options.doctorView, options.patientUserId]);

  return { record: detail, loading };
}
