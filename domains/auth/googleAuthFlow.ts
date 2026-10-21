import type { Router } from "expo-router";

import { AuthApiError } from "@/domains/auth/repository";
import { getPostLoginRoute } from "@/domains/auth/navigation";
import { useAuthStore } from "@/domains/auth/store";

export type GoogleNoAccountPayload = {
  email: string;
  name: string;
  role?: string;
};

/** Existing account → home (or doctor-pending / pending return). */
export function navigateAfterGoogleLogin(
  router: Pick<Router, "replace">,
  returnTo?: string,
): void {
  const { role, doctorApprovalStatus } = useAuthStore.getState();
  router.replace((returnTo as never) ?? getPostLoginRoute(role, doctorApprovalStatus));
}

/** Unknown email → signup with verified email/name prefilled. */
export function navigateGoogleNoAccount(
  router: Pick<Router, "replace">,
  payload: GoogleNoAccountPayload,
  onAccountNotFound?: (payload: GoogleNoAccountPayload) => void,
): void {
  useAuthStore.getState().logout();
  if (onAccountNotFound) {
    onAccountNotFound(payload);
    return;
  }
  router.replace({
    pathname: "/auth/signup",
    params: {
      error: "google_no_account",
      email: payload.email,
      name: payload.name,
      ...(payload.role === "patient" ? { role: payload.role } : {}),
    },
  });
}

export function googleNoAccountPayload(error: unknown, signupRole?: string): GoogleNoAccountPayload | null {
  const apiError = error instanceof AuthApiError ? error : null;
  if (apiError?.code !== "ACCOUNT_NOT_FOUND") return null;
  return {
    email: apiError.email ?? "",
    name: apiError.name_ ?? "",
    ...(signupRole ? { role: signupRole } : {}),
  };
}
