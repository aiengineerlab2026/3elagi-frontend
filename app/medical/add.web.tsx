import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { MedicalAddWebView } from "@/components/medical/MedicalAddWebView";
import { WebDesktopShell } from "@/components/web/WebDesktopShell";
import { useAuthStore } from "@/domains/auth/store";
import { parseBodyPart } from "@/domains/medical/bodyParts";
import { resolveMedicalOwnerUserId } from "@/domains/medical/ownerUserId";

export default function AddMedicalScreenWeb() {
  const {
    category,
    patientUserId: patientUserIdParam,
    bodyPart: bodyPartParam,
  } = useLocalSearchParams<{
    category?: string;
    patientUserId?: string;
    bodyPart?: string;
  }>();
  const profile = useAuthStore((s) => s.profile);
  const ownerUserId = resolveMedicalOwnerUserId(patientUserIdParam, profile?.id);

  useEffect(() => {
    if (category === "prescription") {
      const params = new URLSearchParams();
      if (ownerUserId) params.set("patientUserId", ownerUserId);
      const part = parseBodyPart(bodyPartParam);
      if (part) params.set("bodyPart", part);
      const qs = params.toString();
      router.replace((qs ? `/medical/prescription/add?${qs}` : "/medical/prescription/add") as never);
    }
  }, [category, ownerUserId, bodyPartParam]);

  if (category === "prescription") return null;

  return (
    <WebDesktopShell>
      <MedicalAddWebView />
    </WebDesktopShell>
  );
}
