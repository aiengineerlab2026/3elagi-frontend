import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";
import { useAuthStore } from "@/domains/auth/store";
import { buildMedicalAddEntryHref } from "@/domains/medical/addHref";
import { parseBodyPart } from "@/domains/medical/bodyParts";

/**
 * Kept only so old links to /medical/add-method still land somewhere: nobody
 * picks manual vs AI any more, the profile AI switch decides.
 */
export function MedicalAddMethodChoice() {
  const role = useAuthStore((s) => s.role);
  const {
    patientUserId,
    bodyPart: bodyPartParam,
    requestId: requestIdParam,
    category: categoryParam,
  } = useLocalSearchParams<{
    patientUserId?: string;
    bodyPart?: string;
    requestId?: string;
    category?: string;
  }>();
  const bodyPart = parseBodyPart(bodyPartParam);
  const category =
    categoryParam === "lab" || categoryParam === "xray" || categoryParam === "prescription"
      ? categoryParam
      : undefined;

  return (
    <Redirect
      href={
        buildMedicalAddEntryHref({
          patientUserId: patientUserId?.trim() || undefined,
          bodyPart: bodyPart ?? undefined,
          requestId: requestIdParam?.trim() || undefined,
          category,
          isPatient: role?.toLowerCase() === "patient",
        }) as never
      }
    />
  );
}
