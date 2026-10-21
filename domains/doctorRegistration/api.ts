import { Platform } from "react-native";
import { API_BASE } from "@/constants/api";

export type DoctorRegistrationPhoto = {
  uri: string;
  mimeType: string;
  fileName: string;
};

export async function submitDoctorRegistration(input: {
  doctorName: string;
  email: string;
  phone: string;
  country: string;
  specialityId: string;
  clinicLocation?: string;
  priceLocal: number;
  priceUsd: number;
  photo: DoctorRegistrationPhoto;
}): Promise<void> {
  const form = new FormData();
  form.append("doctor_name", input.doctorName.trim());
  form.append("email", input.email.trim());
  form.append("phone", input.phone.trim());
  form.append("country", input.country.trim().toUpperCase());
  form.append("speciality_id", input.specialityId);
  if (input.clinicLocation?.trim()) {
    form.append("clinic_location", input.clinicLocation.trim());
  }
  form.append("price_local", String(input.priceLocal));
  form.append("price_usd", String(input.priceUsd));

  if (Platform.OS === "web") {
    const res = await fetch(input.photo.uri);
    const blob = await res.blob();
    form.append("photo", blob, input.photo.fileName);
  } else {
    form.append(
      "photo",
      {
        uri: input.photo.uri,
        name: input.photo.fileName,
        type: input.photo.mimeType,
      } as unknown as Blob,
    );
  }

  const response = await fetch(`${API_BASE}/doctor-registration-requests`, {
    method: "POST",
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ??
        data?.error ??
        `Request failed (${response.status})`,
    );
  }
}
