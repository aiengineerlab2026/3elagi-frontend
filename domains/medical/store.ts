import { create } from "zustand";
import { on, emit } from "@/utils/eventBus";
import { AUTH_EVENTS } from "@/domains/auth/events";
import { medicalRepository } from "./repository";
import { MEDICAL_EVENTS } from "./events";
import type { MedicalCategory, MedicalRecord } from "./types";

function sortByDate(records: MedicalRecord[]): MedicalRecord[] {
  return [...records].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );
}

interface MedicalState {
  records: MedicalRecord[];
  /** Set when doctor adds/updates records for a patient; doctor screens refetch on focus. */
  pendingRefreshPatientUserId: string | null;
  notifyMedicalHistoryChanged: (patientUserId: string) => void;
  consumePendingRefresh: () => string | null;
  /** Diagnosis, lab, and x-ray from API; intake kept locally */
  setRecordsFromApi: (apiRecords: MedicalRecord[], ownerId: string) => void;
  mergeApiDocuments: (docs: MedicalRecord[]) => void;
  mergeApiDiagnoses: (diagnoses: MedicalRecord[]) => void;
  upsertDiagnosis: (record: MedicalRecord) => void;
  upsertPrescription: (record: MedicalRecord) => void;
  upsertDocument: (record: MedicalRecord) => void;
  upsertIntake: (record: MedicalRecord) => void;
  clear: () => void;
  add: (input: {
    ownerId: string;
    category: MedicalCategory;
    title: string;
    value?: string;
    notes?: string;
    date?: string;
  }) => void;
  remove: (ownerId: string, id: string) => void;
}

export const useMedicalStore = create<MedicalState>((set, get) => ({
  records: [],
  pendingRefreshPatientUserId: null,
  notifyMedicalHistoryChanged: (patientUserId) =>
    set({ pendingRefreshPatientUserId: patientUserId }),
  consumePendingRefresh: () => {
    const id = get().pendingRefreshPatientUserId;
    if (id) set({ pendingRefreshPatientUserId: null });
    return id;
  },
  setRecordsFromApi: (apiRecords, ownerId) =>
    set(() => ({ records: sortByDate(apiRecords) })),
  mergeApiDocuments: (docs) =>
    set((state) => {
      const rest = state.records.filter(
        (r) => r.category !== "lab" && r.category !== "xray",
      );
      return { records: sortByDate([...rest, ...docs]) };
    }),
  mergeApiDiagnoses: (diagnoses) =>
    set((state) => {
      const rest = state.records.filter((r) => r.category !== "diagnosis");
      return { records: sortByDate([...rest, ...diagnoses]) };
    }),
  upsertDiagnosis: (record) =>
    set((state) => {
      const rest = state.records.filter((r) => r.id !== record.id);
      return { records: sortByDate([record, ...rest]) };
    }),
  upsertPrescription: (record) => {
    set((state) => {
      const rest = state.records.filter((r) => r.id !== record.id);
      return { records: sortByDate([record, ...rest]) };
    });
    emit(MEDICAL_EVENTS.PRESCRIPTION_UPSERTED, {
      prescriptionId: record.id,
      ownerId: record.ownerId,
    });
  },
  upsertDocument: (record) =>
    set((state) => {
      const rest = state.records.filter((r) => r.id !== record.id);
      return { records: sortByDate([record, ...rest]) };
    }),
  upsertIntake: (record) =>
    set((state) => {
      const rest = state.records.filter((r) => r.id !== record.id);
      return { records: sortByDate([record, ...rest]) };
    }),
  clear: () => set({ records: [] }),
  add: (input) => {
    const record = medicalRepository.add({
      ownerId: input.ownerId,
      category: input.category,
      title: input.title,
      value: input.value,
      notes: input.notes,
      date: input.date || new Date().toISOString(),
    });
    set((state) => ({ records: sortByDate([record, ...state.records]) }));
  },
  remove: (ownerId, id) => {
    medicalRepository.remove(ownerId, id);
    set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
  },
}));

// Cross-domain subscription: clear on logout
on(AUTH_EVENTS.LOGOUT, () => {
  useMedicalStore.getState().clear();
});
