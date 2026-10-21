import type { ConsultationActionMeta } from "@/domains/chat/types";
import { getApiLang, getDict } from "@/domains/i18n/store";
import type { ComplaintMessage } from "./api";

type MedicalLinkMeta = {
  record_type?: string;
  title?: string;
  note?: string;
};

function consultationActionText(m: ComplaintMessage): string {
  const meta = m.attachment_meta as ConsultationActionMeta | null | undefined;
  const note = m.content?.trim();
  const parts: string[] = [];
  const t = getDict(getApiLang());

  if (!meta?.action) {
    return note || "Consultation update";
  }

  if (meta.action === "start") {
    parts.push("Consultation started");
    if (note && note !== "Consultation request") parts.push(note);
    if (meta.reserved_points != null) {
      parts.push(t.consultations.reservedInThread(t.credits.egp(meta.reserved_points)));
    }
  } else if (meta.action === "end") {
    parts.push("Consultation ended");
    if (note && note !== "Consultation ended") parts.push(note);
    const dx = meta.diagnosis_summary;
    if (dx?.desc) {
      parts.push(`Diagnosis: ${dx.desc}`);
      if (dx.symptoms?.length) {
        parts.push(
          `Symptoms: ${dx.symptoms.map((s) => s.desc).filter(Boolean).join(", ")}`,
        );
      }
      if (dx.linked_records?.length) {
        parts.push(
          `Linked results: ${dx.linked_records.map((r) => r.title).join(", ")}`,
        );
      }
    }
  } else if (meta.action === "cancel") {
    parts.push("Consultation cancelled");
    const reason =
      meta.cancel_reason?.trim() ||
      (meta.cancel_reason_type === "video_consultation"
        ? "Needs a video consultation"
        : meta.cancel_reason_type === "onsite_visit"
          ? "Needs an on-site visit"
          : meta.cancel_reason_type === "other"
            ? "Other reason"
            : null);
    if (reason) parts.push(reason);
    else if (note && note !== "Consultation cancelled") parts.push(note);
  } else if (meta.action === "accept") {
    parts.push("Consultation accepted");
  } else if (meta.action === "reject") {
    parts.push("Consultation request declined");
    if (note && note !== "Consultation rejected") parts.push(note);
  }

  return parts.join(" · ") || note || "Consultation update";
}

/** Human-readable line for admin complaint thread review. */
export function formatComplaintMessageText(m: ComplaintMessage): string {
  const note = m.content?.trim();

  switch (m.type) {
    case "text":
      return note || "";
    case "consultation_action":
      return consultationActionText(m);
    case "image":
      return note && note !== "Photo" ? `Photo: ${note}` : "Photo";
    case "video":
      return note && note !== "Video" ? `Video: ${note}` : "Video";
    case "voice":
      return "Voice message";
    case "medical_link": {
      const link = m.attachment_meta as MedicalLinkMeta | null | undefined;
      const title = link?.title?.trim();
      const typeLabel =
        link?.record_type === "lab"
          ? "Lab result"
          : link?.record_type === "xray"
            ? "X-ray"
            : link?.record_type === "diagnosis"
              ? "Diagnosis record"
              : link?.record_type === "intake"
                ? "Intake exam"
                : link?.record_type === "prescription"
                  ? "Prescription"
                  : "Medical record";
      const base = title ? `${typeLabel}: ${title}` : typeLabel;
      const linkNote = link?.note?.trim();
      return linkNote ? `${base} — ${linkNote}` : base;
    }
    case "document_request": {
      const req = m.attachment_meta as {
        request_type?: string;
        title?: string;
        description?: string;
      } | null;
      const kind =
        req?.request_type === "xray" ? "X-ray request" : "Lab request";
      const title = req?.title?.trim();
      const base = title ? `${kind}: ${title}` : kind;
      const desc = req?.description?.trim();
      return desc ? `${base} — ${desc}` : base;
    }
    case "access_action":
    case "appointment_action":
      return note || "System message";
    default:
      return note || m.type.replace(/_/g, " ");
  }
}
