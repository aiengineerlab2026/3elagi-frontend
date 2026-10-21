import { router } from "expo-router";
import { useCallback } from "react";
import { promptAuthForConsultation } from "@/domains/auth/guestBrowse";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";

/**
 * Opening a doctor from any roster: profile when we know the doctor row,
 * chat otherwise, and the sign-in prompt for guests.
 */
export function useOpenDoctor() {
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const signedIn = isSignedIn(profile, accessToken);

  const openDoctorProfile = useCallback(
    (doctorUserId: string, doctorEntityId?: string) => {
      if (!signedIn) {
        promptAuthForConsultation(`/chat/${doctorUserId}`);
        return;
      }
      if (!doctorEntityId) {
        router.push({
          pathname: "/chat/[id]",
          // Remembered for the no-history case: back returns to the doctor list.
          params: { id: doctorUserId, from: "doctors" },
        });
        return;
      }
      router.push({
        pathname: "/doctor/[doctorId]",
        params: { doctorId: doctorEntityId, userId: doctorUserId },
      });
    },
    [signedIn],
  );

  const startConsultationWithDoctor = useCallback(
    (doctorUserId: string) => {
      if (!signedIn) {
        promptAuthForConsultation(`/chat/${doctorUserId}`);
        return;
      }
      router.push({
        pathname: "/chat/[id]",
        params: { id: doctorUserId, from: "doctors" },
      });
    },
    [signedIn],
  );

  return { signedIn, openDoctorProfile, startConsultationWithDoctor };
}
