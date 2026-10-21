export type IntakeQuestionType =
  | "text"
  | "single_choice"
  | "multi_choice"
  | "image"
  | "video"
  | "audio"
  | "guidance";

export interface IntakeOption {
  id: string;
  text: string;
}

export interface IntakeQuestion {
  id: string;
  text: string;
  type: IntakeQuestionType;
  required: boolean;
  options: IntakeOption[];
}

export interface IntakeTestTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  questions: IntakeQuestion[];
  created_at: string;
  updated_at: string;
}

export type IntakeExamRecurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";

export type IntakeExamInstanceStatus = "pending" | "in_progress" | "completed";

export interface IntakeExamInstance {
  id: string;
  assignment_id: string;
  patient_user_id: string;
  doctor_id: string;
  doctor_name: string | null;
  intake_test_id: string;
  exam_name: string;
  instance_number: number;
  deadline_at: string;
  questions: IntakeQuestion[];
  answers: Record<string, string[]>;
  status: IntakeExamInstanceStatus;
  completed_at: string | null;
  recurrence_type: IntakeExamRecurrence;
  recurrence_interval: number;
  created_at: string;
  diagnosis_id?: string | null;
  linked_diagnoses?: Array<{ id: string; desc: string }>;
}

export interface IntakeExamDetail {
  instanceId: string;
  assignmentId: string;
  intakeTestId: string;
  deadlineAt: string;
  status: IntakeExamInstanceStatus;
  questions: IntakeQuestion[];
  answers: Record<string, string[]>;
  instanceNumber: number;
  recurrenceType: IntakeExamRecurrence;
  recurrenceInterval: number;
  completedAt: string | null;
}
