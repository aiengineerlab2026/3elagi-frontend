import { useAuthStore } from "@/domains/auth/store";

export function isAdminRole(role: string | null | undefined): boolean {
  return role?.toLowerCase() === "admin";
}

/** Block admin API calls from doctor/patient sessions on the client. */
export function assertAdminClientAccess(): void {
  const role = useAuthStore.getState().role;
  if (!isAdminRole(role)) {
    throw new Error("Forbidden: admin access required");
  }
}
