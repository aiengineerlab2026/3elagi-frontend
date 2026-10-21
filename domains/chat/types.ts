import type { MessageEmotionItem } from "@/domains/emotions";

export type Presence = "online" | "away" | "offline";

export type ChatMessageType =
  | "text"
  | "image"
  | "video"
  | "voice"
  | "medical_link"
  | "document_request"
  | "access_action"
  | "appointment_action"
  | "consultation_action";

/** `pending` = the doctor has not accepted or rejected the request yet. */
export type ConsultationStatus =
  | "pending"
  | "open"
  | "ended"
  | "cancelled"
  | "rejected";
export type ConsultationActionType =
  | "start"
  | "accept"
  | "reject"
  | "end"
  | "cancel"
  | "payment_request"
  | "payment_submitted"
  | "payment_approved"
  | "payment_rejected"
  | "cancel_request"
  | "cancel_approved"
  | "cancel_declined";
export type ConsultationCancelReasonType =
  | "video_consultation"
  | "onsite_visit"
  | "other";

export interface ConsultationDiagnosisSummary {
  id: string;
  desc: string;
  symptoms?: { desc: string }[];
  linked_records?: {
    id: string;
    title: string;
    record_type: "lab" | "xray";
  }[];
}

export interface ConsultationActionMeta
  extends PaymentActionMeta,
    PendingChangeMeta {
  consultation_id: string;
  action: ConsultationActionType;
  status: ConsultationStatus;
  reserved_points?: number;
  /** ISO-2 country of the patient, from their IP at request time. */
  patient_country?: string | null;
  cancel_reason_type?: ConsultationCancelReasonType;
  cancel_reason?: string;
  diagnosis_id?: string | null;
  diagnosis_summary?: ConsultationDiagnosisSummary | null;
}

export type AccessActionType =
  | "grant_records"
  | "revoke_records"
  | "patient_block"
  | "doctor_block"
  | "patient_unblock"
  | "doctor_unblock";

export interface AccessActionMeta {
  action: AccessActionType;
}

export type AppointmentActionType =
  | "request"
  | "confirm"
  | "reject"
  | "cancel"
  | "payment_request"
  | "payment_submitted"
  | "payment_approved"
  | "payment_rejected"
  | "reschedule_request"
  | "reschedule_accepted"
  | "reschedule_declined"
  | "cancel_request"
  | "cancel_approved"
  | "cancel_declined";

/** A change waiting on the other side: a new slot, or cancelling. */
export interface PendingChangeMeta {
  /** Who asked — only the other side may answer. */
  pending_by?: string | null;
  proposed_date?: string | null;
  proposed_time?: string | null;
}

/** Cash the doctor asked for, paid outside the app. */
export interface PaymentActionMeta {
  payment_status?: "none" | "awaiting_payment" | "proof_submitted" | "paid";
  payment_amount?: number | null;
  payment_currency?: string | null;
  /** bank transfer or mobile wallet URL. */
  payment_method?: "bank" | "wallet" | null;
  /** Wallet URL when payment_method is wallet. */
  payment_link?: string | null;
  payment_proof_url?: string | null;
  /** Doctor bank details when payment_method is bank. */
  doctor_iban?: string | null;
  doctor_account_holder?: string | null;
  doctor_national_id?: string | null;
}

export interface AppointmentActionMeta
  extends PaymentActionMeta,
    PendingChangeMeta {
  appointment_id: string;
  action: AppointmentActionType;
  date: string;
  time: string;
  status?: string;
  meeting_link?: string | null;
  /** Doctor-configured video consultation length in minutes. */
  duration_minutes?: number;
  /** AI-written, doctor-facing note about why the patient booked + relevant history. */
  patient_insight?: string;
}

export interface MedicalLinkMeta {
  record_type: "lab" | "xray" | "diagnosis" | "intake" | "prescription";
  record_id: string;
  title: string;
  note?: string;
}

export interface DocumentRequestMeta {
  request_id: string;
  request_type: "lab" | "xray";
  title: string;
  description?: string;
  status: "pending" | "fulfilled" | "cancelled";
  /** Medical document id when the patient uploaded the lab/x-ray result. */
  fulfilled_document_id?: string;
}

export interface ChatUser {
  id: string;
  name: string;
  photoUrl?: string | null;
  presence: Presence;
  lastSeenAt?: string;
  role?: "doctor" | "patient" | "support";
  specialty?: string;
  /** ISO 3166-1 alpha-2 residence country (doctor or patient). */
  country?: string;
  rating?: number;
  ratingTotal?: number;
  consultationPrice?: number;
  videoConsultationPrice?: number;
  /** Cash fees: local currency at home, USD abroad — see domains/doctor/fees. */
  textPriceLocal?: number | null;
  textPriceUsd?: number | null;
  videoPriceLocal?: number | null;
  videoPriceUsd?: number | null;
  /** Doctor takes immediate calls from the chat. */
  immediateCallEnabled?: boolean;
  /** Doctor's call line was busy when this was fetched (live updates via presence). */
  onCall?: boolean;
  doctorEntityId?: string;
  /** Profile tags (canonical labels). */
  tags?: string[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  type: ChatMessageType;
  attachmentUrl?: string | null;
  localAttachmentUrl?: string | null;
  medicalLink?: MedicalLinkMeta | null;
  documentRequest?: DocumentRequestMeta | null;
  accessAction?: AccessActionMeta | null;
  appointmentAction?: AppointmentActionMeta | null;
  consultationAction?: ConsultationActionMeta | null;
  pending?: boolean;
  failed?: boolean;
  editedAt?: string | null;
  /** When the recipient read this message (ISO). */
  readAt?: string | null;
  pointsBalance?: number;
  emotions?: MessageEmotionItem[];
}

export interface Conversation {
  id: string;
  user: ChatUser;
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export interface SendMessageInput {
  recipientId: string;
  type?: ChatMessageType;
  content?: string;
  attachmentUrl?: string;
  medicalLink?: MedicalLinkMeta;
  documentRequest?: DocumentRequestMeta;
  accessAction?: AccessActionMeta;
  appointmentAction?: AppointmentActionMeta;
}
