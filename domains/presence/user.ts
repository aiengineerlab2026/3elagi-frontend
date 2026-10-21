import type { LoggedInUser } from "./types";

/** Build the presence payload from the auth store. Shared so every socket that
 *  joins the user room announces the SAME user (no partial overwrites). */
export function buildLoggedInUser(
  profile: { id: string; name: string; email: string; avatarUrl?: string },
  role: string | null,
  specialty: string | null,
  specialityId: string | null,
  doctorId: string | null,
): LoggedInUser {
  const isDoctor = role?.toLowerCase() === "doctor";
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: role ?? "patient",
    photo_url: profile.avatarUrl ?? null,
    specialty: isDoctor ? specialty : null,
    speciality_id: isDoctor ? specialityId : null,
    doctor_id: isDoctor ? doctorId : null,
  };
}
