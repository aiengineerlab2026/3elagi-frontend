import { useAuthStore } from "./store";

export function isAuthHttpStatus(status: number): boolean {
  return status === 401 || status === 403;
}

export function isAuthErrorMessage(message?: string | null): boolean {
  const lower = (message ?? "").toLowerCase();
  return (
    lower.includes("unauthorized") ||
    lower.includes("invalid token") ||
    lower.includes("jwt") ||
    lower.includes("forbidden") ||
    lower.includes("not authenticated") ||
    lower.includes("session expired")
  );
}

/** Clear the session when tokens are missing or rejected — guest AI stays available. */
export function logoutOnAuthFailure(): void {
  const { profile, accessToken, refreshToken, logout } = useAuthStore.getState();
  if (profile || accessToken || refreshToken) {
    logout();
  }
}
