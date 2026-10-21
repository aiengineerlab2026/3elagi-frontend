import { resolveDoctorLocation } from "@/components/doctor/doctorProfileLocation";
import type { PublicDoctorProfile } from "@/domains/doctor/api";

export function hasDoctorAboutSection(doctor: PublicDoctorProfile): boolean {
  return !!doctor.description?.trim();
}

export function hasDoctorProfessionalSection(
  doctor: PublicDoctorProfile,
  specialtyLabel: string,
): boolean {
  if (specialtyLabel.trim()) return true;
  if (doctor.experienceYears != null && doctor.experienceYears > 0) return true;
  return doctor.tags.some((tag) => tag.trim());
}

export function hasDoctorLocationSection(doctor: PublicDoctorProfile): boolean {
  return !!resolveDoctorLocation(doctor.clinic, doctor.location);
}
