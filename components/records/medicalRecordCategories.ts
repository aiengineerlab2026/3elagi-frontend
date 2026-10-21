import {
  Activity,
  Beaker,
  ClipboardList,
  Pill,
  ScanLine,
  type LucideIcon,
} from "lucide-react-native";
import type { MedicalCategory, MedicalRecord } from "@/domains/medical/types";
import type { Translations } from "@/constants/translations";

export type MedicalRecordCategoryMeta = {
  key: MedicalCategory;
  labelEn: string;
  labelAr: string;
  Icon: LucideIcon;
  color: string;
};

export const MEDICAL_RECORD_CATEGORIES: MedicalRecordCategoryMeta[] = [
  { key: "diagnosis", labelEn: "Diagnosis", labelAr: "التشخيص", Icon: Activity, color: "#ef4444" },
  { key: "lab", labelEn: "Lab results", labelAr: "نتائج المختبر", Icon: Beaker, color: "#10b981" },
  { key: "xray", labelEn: "Imaging", labelAr: "الأشعة", Icon: ScanLine, color: "#8b5cf6" },
  { key: "prescription", labelEn: "Prescription", labelAr: "روشتة", Icon: Pill, color: "#f59e0b" },
  { key: "intake", labelEn: "Intake", labelAr: "فحص الاستقبال", Icon: ClipboardList, color: "#3057F2" },
];

/** Show intake exam records from API in medical history UI. */
export const SHOW_INTAKE_RECORDS = true;

export function getDisplayMedicalRecordCategories(): MedicalRecordCategoryMeta[] {
  return SHOW_INTAKE_RECORDS
    ? MEDICAL_RECORD_CATEGORIES
    : MEDICAL_RECORD_CATEGORIES.filter((c) => c.key !== "intake");
}

export function withoutIntakeRecords(records: MedicalRecord[]): MedicalRecord[] {
  return SHOW_INTAKE_RECORDS ? records : records.filter((r) => r.category !== "intake");
}

export const ADD_MEDICAL_CATEGORIES = MEDICAL_RECORD_CATEGORIES.filter(
  (c) => c.key !== "intake" && c.key !== "prescription",
);

/** Patients cannot add diagnoses — only doctors can. */
export const PATIENT_ADD_MEDICAL_CATEGORIES = ADD_MEDICAL_CATEGORIES.filter(
  (c) => c.key !== "diagnosis",
);

export function getAddMedicalCategories(isDoctor: boolean): typeof ADD_MEDICAL_CATEGORIES {
  return isDoctor ? ADD_MEDICAL_CATEGORIES : PATIENT_ADD_MEDICAL_CATEGORIES;
}

export function getCategoryMeta(key: MedicalCategory): MedicalRecordCategoryMeta {
  return MEDICAL_RECORD_CATEGORIES.find((c) => c.key === key)!;
}

export function getLocalizedCategoryLabel(
  key: MedicalCategory,
  t: Translations,
): string {
  return t.records.categories[key];
}

export function getLocalizedAddLabel(key: MedicalCategory, t: Translations): string {
  switch (key) {
    case "lab":
      return t.records.addLab;
    case "xray":
      return t.records.addXray;
    case "prescription":
      return t.records.addPrescription;
    case "diagnosis":
      return t.records.addDiagnosis;
    default:
      return getLocalizedCategoryLabel(key, t);
  }
}

export function getRecordTimestamp(record: MedicalRecord): number {
  const raw = record.date || record.createdAt;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function getRecordSubtitle(record: MedicalRecord): string | undefined {
  if (record.category === "prescription" && record.medications?.length) {
    const names = record.medications
      .map((m) => m.medication_name.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(", ");
    if (names) return names;
  }
  return (
    record.notes?.trim() ||
    record.value?.trim() ||
    record.fileName?.trim() ||
    undefined
  );
}

export function groupRecordsByMonth(
  records: MedicalRecord[],
  locale: string,
): { key: string; label: string; items: MedicalRecord[] }[] {
  const map = new Map<string, MedicalRecord[]>();

  for (const record of records) {
    const date = new Date(record.date || record.createdAt);
    const key = Number.isNaN(date.getTime())
      ? "unknown"
      : `${date.getFullYear()}-${date.getMonth()}`;
    const bucket = map.get(key) ?? [];
    bucket.push(record);
    map.set(key, bucket);
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => {
      const sample = items[0];
      const date = new Date(sample.date || sample.createdAt);
      const label = Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString(locale, { month: "long", year: "numeric" });
      return {
        key,
        label,
        items: [...items].sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a)),
      };
    });
}
