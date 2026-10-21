import { usePathname } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { ProductTourOverlay } from "@/components/onboarding/ProductTourOverlay";
import {
  ensureDoctorOnboarding,
  fetchDoctorMeTourState,
  markDoctorTourComplete,
} from "@/domains/onboarding/doctorTourApi";
import { useProductTourStore } from "@/domains/onboarding/productTourStore";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { canUseChat } from "@/domains/chat/access";
import { useChatStore } from "@/domains/chat/store";

function isApproved(
  fromApi: string | null | undefined,
  fromStore: string | null | undefined,
): boolean {
  return fromApi === "approved" || fromStore === "approved";
}

/** Starts doctor onboarding tours once per doctor (tracked on the server). */
export function DoctorTourBootstrap() {
  const pathname = usePathname();
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const doctorApprovalStatus = useAuthStore((s) => s.doctorApprovalStatus);
  const profile = useAuthStore((s) => s.profile);
  const loadConversations = useChatStore((s) => s.loadConversations);

  const startMainTour = useProductTourStore((s) => s.startMainTour);
  const setTestPatientUserId = useProductTourStore((s) => s.setTestPatientUserId);
  const exitReason = useProductTourStore((s) => s.exitReason);
  const completedPhase = useProductTourStore((s) => s.completedPhase);
  const clearExit = useProductTourStore((s) => s.clearExit);
  const setDoctorApprovalStatus = useAuthStore((s) => s.setDoctorApprovalStatus);
  /** Avoid re-launching the same tour on every route change in one session. */
  const mainTourStartedRef = useRef(false);

  useEffect(() => {
    mainTourStartedRef.current = false;
  }, [profile?.id]);

  const refreshChats = useCallback(async () => {
    if (!accessToken || !profile?.id || role?.toLowerCase() !== "doctor" || !canUseChat(role)) {
      return;
    }
    await loadConversations(accessToken, profile.id, role).catch(() => undefined);
  }, [accessToken, profile?.id, role, loadConversations]);

  const bootstrap = useCallback(async () => {
    if (!hydrated || !role || role.toLowerCase() !== "doctor") return;
    if (!isSignedIn(profile, accessToken)) return;

    const state = await fetchDoctorMeTourState(accessToken);

    if (state?.approval_status && state.approval_status !== doctorApprovalStatus) {
      setDoctorApprovalStatus(state.approval_status);
    }

    if (!isApproved(state?.approval_status, doctorApprovalStatus)) return;

    if (!state) return;

    const onboardingPatientId = await ensureDoctorOnboarding(accessToken);
    const testPatientId =
      onboardingPatientId ??
      state?.onboarding_test_patient_user_id ??
      null;
    if (testPatientId) setTestPatientUserId(testPatientId);
    await refreshChats();

    const tourActive = useProductTourStore.getState().active;
    const productDone = Boolean(state.product_tour_completed_at);

    if (!productDone && !tourActive && !mainTourStartedRef.current) {
      startMainTour();
      mainTourStartedRef.current = true;
    }
  }, [
    hydrated,
    accessToken,
    profile,
    role,
    doctorApprovalStatus,
    setDoctorApprovalStatus,
    setTestPatientUserId,
    startMainTour,
    refreshChats,
  ]);

  useEffect(() => {
    void bootstrap().catch(() => undefined);
  }, [bootstrap, pathname, doctorApprovalStatus, accessToken, profile?.id]);

  useEffect(() => {
    if (exitReason !== "complete" || completedPhase !== "main") return;

    const finish = async () => {
      await markDoctorTourComplete(accessToken, "product");
      await markDoctorTourComplete(accessToken, "profile");
      clearExit();
    };

    void finish().catch(() => clearExit());
  }, [exitReason, completedPhase, accessToken, clearExit]);

  if (role?.toLowerCase() !== "doctor" || !hydrated) return null;

  return (
    <ProductTourOverlay
      onSkip={() => {
        void markDoctorTourComplete(accessToken, "product");
        void markDoctorTourComplete(accessToken, "profile");
      }}
      onCompleteMain={async () => {
        await markDoctorTourComplete(accessToken, "product");
        await markDoctorTourComplete(accessToken, "profile");
      }}
    />
  );
}
