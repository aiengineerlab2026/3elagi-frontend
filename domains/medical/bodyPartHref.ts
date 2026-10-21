import type { BodyPart } from "@/domains/medical/bodyParts";

/** Filtered medical records for a skeleton body part. */
export function buildBodyPartRecordsHref(
  part: BodyPart,
  options?: { patientUserId?: string | null },
): string {
  const params = new URLSearchParams();
  const owner = options?.patientUserId?.trim();
  if (owner) params.set("patientUserId", owner);
  const qs = params.toString();
  return qs ? `/medical/body/${part}?${qs}` : `/medical/body/${part}`;
}
