import {
  Activity,
  Beaker,
  ClipboardList,
  Pill,
  ScanLine,
  type LucideIcon,
} from "lucide-react-native";
import type { MedicalCategory } from "@/domains/medical/types";

export const MEDICAL_RECORD_CATEGORY_META: Record<
  MedicalCategory,
  { labelEn: string; labelAr: string; Icon: LucideIcon; color: string }
> = {
  diagnosis: {
    labelEn: "Diagnosis",
    labelAr: "التشخيص",
    Icon: Activity,
    color: "#ef4444",
  },
  lab: {
    labelEn: "Lab Result",
    labelAr: "نتائج المختبر",
    Icon: Beaker,
    color: "#10b981",
  },
  xray: {
    labelEn: "X-ray / Scan",
    labelAr: "الأشعة والمسح",
    Icon: ScanLine,
    color: "#8b5cf6",
  },
  prescription: {
    labelEn: "Prescription",
    labelAr: "روشتة",
    Icon: Pill,
    color: "#f59e0b",
  },
  intake: {
    labelEn: "Intake Exam",
    labelAr: "فحص الاستقبال",
    Icon: ClipboardList,
    color: "#3057F2",
  },
};

export const IMAGE_EXTS = /\.(jpe?g|png|gif|webp|avif|heic|heif)(\?.*)?$/i;
export const PDF_EXT = /\.pdf(\?.*)?$/i;

export function isMedicalImageAttachment(
  fileUrl?: string | null,
  fileName?: string | null,
): boolean {
  if (!fileUrl) return false;
  return IMAGE_EXTS.test(fileUrl) || IMAGE_EXTS.test(fileName ?? "");
}

export function isMedicalPdfAttachment(
  fileUrl?: string | null,
  fileName?: string | null,
): boolean {
  if (!fileUrl) return false;
  return PDF_EXT.test(fileUrl) || PDF_EXT.test(fileName ?? "");
}
