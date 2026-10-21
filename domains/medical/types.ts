export type MedicalCategory = "diagnosis" | "lab" | "xray" | "intake" | "prescription";

export type { BodyPart } from "./bodyParts";

export interface MedicalAiInsight {
  description: string;
  possible_diseases: string;
}

export interface PrescriptionMedication {
  id?: string;
  medication_name: string;
  interval?: string;
  dose?: string;
  notes?: string;
}

export interface DiagnosisSymptom {
  id: string;
  desc: string;
  createdAt: string;
}

export interface LinkedDiagnosisSummary {
  id: string;
  title: string;
}

export interface LinkedConsultationSummary {
  id: string;
  status: "pending" | "open" | "ended" | "cancelled" | "rejected";
  createdAt: string;
  closedAt: string | null;
  doctorId: string;
  patientId: string;
  diagnosisId: string | null;
  doctorName: string;
  patientName: string;
}

export interface IntakeExamDetail {
  instanceId: string;
  assignmentId: string;
  intakeTestId: string;
  deadlineAt: string;
  status: "pending" | "in_progress" | "completed";
  questions: import("@/domains/intake-exams/types").IntakeQuestion[];
  answers: Record<string, string[]>;
  instanceNumber: number;
  recurrenceType: import("@/domains/intake-exams/types").IntakeExamRecurrence;
  recurrenceInterval: number;
  completedAt: string | null;
}

export interface MedicalRecord {
  id: string;
  ownerId: string;
  category: MedicalCategory;
  title: string;
  notes?: string;
  /** Free-form value: lab result text, intake answer, etc. */
  value?: string;
  date: string; // ISO
  createdAt: string;
  /** Set for lab/xray records loaded from the API */
  fileUrl?: string;
  fileName?: string;
  /** Linked symptoms when category is diagnosis */
  symptoms?: DiagnosisSymptom[];
  /** Doctor who created the diagnosis (when set by a doctor) */
  doctorName?: string | null;
  /** Doctor entity id when a doctor created this diagnosis */
  doctorId?: string | null;
  /** Lab / X-ray / prescription records linked to this diagnosis */
  linkedDocuments?: MedicalRecord[];
  /** Diagnoses linked to this lab/xray record */
  linkedDiagnoses?: LinkedDiagnosisSummary[];
  /** Consultations that produced this prescription (via shared diagnosis). */
  linkedConsultations?: LinkedConsultationSummary[];
  /** @deprecated Use linkedDiagnoses — kept for older API responses */
  diagnosisId?: string | null;
  /** Medication rows when category is prescription */
  medications?: PrescriptionMedication[];
  /** Generated PDF for doctor prescriptions */
  pdfUrl?: string | null;
  /** Scanned/uploaded prescription photo */
  imageUrl?: string | null;
  /** AI-generated summary and possible conditions */
  aiInsight?: MedicalAiInsight | null;
  /** Anatomical region this record relates to (incl. general). */
  bodyPart?: import("./bodyParts").BodyPart;
  /** Intake exam instance metadata when category is intake */
  intakeExam?: IntakeExamDetail;
}
