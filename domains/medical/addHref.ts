import { isAiEnabled } from "@/domains/ai/aiPreference";
import type { BodyPart } from "@/domains/medical/bodyParts";
import type { MedicalCategory } from "@/domains/medical/types";

export type MedicalAddMethod = "manual" | "ai";

function ownerAndBodyParams(options?: {
  patientUserId?: string | null;
  bodyPart?: BodyPart | null;
  requestId?: string | null;
  category?: MedicalCategory | null;
}): URLSearchParams {
  const params = new URLSearchParams();
  const owner = options?.patientUserId?.trim();
  const bodyPart = options?.bodyPart;
  const requestId = options?.requestId?.trim();
  const category = options?.category;
  if (owner) params.set("patientUserId", owner);
  if (bodyPart) params.set("bodyPart", bodyPart);
  if (requestId) params.set("requestId", requestId);
  if (category && category !== "prescription") params.set("category", category);
  return params;
}

/** Entry: choose manual vs AI before the form (patients only). */
export function buildMedicalAddMethodHref(options?: {
  patientUserId?: string | null;
  bodyPart?: BodyPart | null;
  requestId?: string | null;
  category?: MedicalCategory | null;
}): string {
  const qs = ownerAndBodyParams(options).toString();
  return qs ? `/medical/add-method?${qs}` : "/medical/add-method";
}

/**
 * Entry for "Add medical record". Nobody is asked manual-vs-AI any more — the
 * AI switch in the profile decides, and doctors always get the manual form.
 */
export function buildMedicalAddEntryHref(options?: {
  patientUserId?: string | null;
  bodyPart?: BodyPart | null;
  requestId?: string | null;
  category?: MedicalCategory | null;
  /** Patient role → AI form when AI is on; doctor / other → manual form. */
  isPatient?: boolean;
}): string {
  if (options?.isPatient && isAiEnabled()) {
    return buildMedicalAddAiHref(options);
  }
  return buildMedicalAddHref(options?.category ?? null, options);
}

/** Build medical add / prescription routes with optional category, owner + body part. */
export function buildMedicalAddHref(
  category?: MedicalCategory | null,
  options?: {
    patientUserId?: string | null;
    bodyPart?: BodyPart | null;
    requestId?: string | null;
  },
): string {
  if (category === "prescription") {
    const params = ownerAndBodyParams(options);
    const qs = params.toString();
    return qs ? `/medical/prescription/add?${qs}` : "/medical/prescription/add";
  }

  const params = ownerAndBodyParams({ ...options, category });
  const qs = params.toString();
  return qs ? `/medical/add?${qs}` : "/medical/add";
}

/** AI-assisted add: upload document → confirm extracted fields. */
export function buildMedicalAddAiHref(options?: {
  patientUserId?: string | null;
  bodyPart?: BodyPart | null;
  requestId?: string | null;
  category?: MedicalCategory | null;
}): string {
  const qs = ownerAndBodyParams(options).toString();
  return qs ? `/medical/add-ai?${qs}` : "/medical/add-ai";
}
