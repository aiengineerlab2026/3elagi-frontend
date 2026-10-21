import { API_BASE } from "@/constants/api";

export type ReservationStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface SurgicalOperation {
  id: string;
  name_en: string;
  name_ar: string;
  speciality_id: string;
  is_active: boolean;
  speciality?: { id: string; name_en: string; name_ar: string } | null;
  /** Set when a hospital added it (not in the predefined catalog). */
  hospital_id?: string | null;
  hospital?: { id: string; name: string } | null;
}

export interface Hospital {
  id: string;
  name: string;
  location: string;
  description: string;
  phone: string;
  is_active?: boolean;
  owner_id?: string | null;
  approval_status?: ApprovalStatus;
  /** Admin list only: the hospital's login account. */
  owner?: { id: string; email: string } | null;
}

export interface HospitalDoctor {
  id: string;
  name: string;
  photo_url?: string | null;
  professional_title?: string | null;
  speciality?: { id: string; name_en: string; name_ar: string } | null;
  /** Only set by the hospital's doctor search when searching by email. */
  email?: string | null;
  /** All specialities (hospital link listing only). */
  specialities?: { id: string; name_en: string; name_ar: string }[];
}

export interface HospitalSlotRow {
  id?: string;
  operation_id: string;
  doctor_id: string;
  day_of_week: number;
  /** Set = one-off window on this date (doctor calendar proposals). */
  date?: string | null;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  /** Only approved windows are bookable; doctor proposals start pending. */
  status?: ApprovalStatus;
  created_by?: "hospital" | "doctor";
  operation?: SurgicalOperation;
}

export interface HospitalLink {
  hospital_id: string;
  doctor_id: string;
  status: ApprovalStatus;
  doctor?: HospitalDoctor;
  hospital?: Pick<Hospital, "id" | "name" | "location">;
}

export interface HospitalOverrideRow {
  id?: string;
  /** null = every operation. */
  operation_id: string | null;
  /** null = every doctor. */
  doctor_id: string | null;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  start_time?: string | null;
  end_time?: string | null;
  slot_minutes?: number | null;
  note?: string | null;
}

/** A surgery the hospital offers and the doctors assigned to it. */
export interface HospitalSurgeryRow {
  hospital_id: string;
  operation_id: string;
  doctor_ids: string[];
  operation?: SurgicalOperation;
}

export interface MyHospital extends Hospital {
  links: HospitalLink[];
  surgeries: HospitalSurgeryRow[];
  slots: HospitalSlotRow[];
  overrides: HospitalOverrideRow[];
}

export interface SurgerySlot {
  time: string;
  taken: boolean;
}

export interface AvailabilityDay {
  date: string;
  slots: SurgerySlot[];
}

export interface SurgeryReservation {
  id: string;
  date: string;
  time: string;
  /** Overall: approved once both approve, rejected if either rejects. */
  status: ReservationStatus;
  hospital_status?: ApprovalStatus;
  doctor_status?: ApprovalStatus;
  notes: string | null;
  hospital?: Hospital;
  operation?: SurgicalOperation;
  doctor?: { id: string; name: string; photo_url?: string | null };
  patient_name?: string | null;
  patient_phone?: string | null;
}

async function request<T>(path: string, token?: string | null, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ??
        `Request failed (${res.status})`,
    );
  }
  return data as T;
}

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

const qs = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => !!e[1]),
  ).toString();
  return s ? `?${s}` : "";
};

// ── Public browse ─────────────────────────────────────────────────────
export const fetchOperations = (specialityId?: string) =>
  request<SurgicalOperation[]>(`/surgical-operations${qs({ speciality_id: specialityId })}`);

export const fetchHospitals = (operationId?: string) =>
  request<Hospital[]>(`/hospitals${qs({ operation_id: operationId })}`);

export const fetchHospitalDoctors = (hospitalId: string, operationId?: string) =>
  request<HospitalDoctor[]>(
    `/hospitals/${hospitalId}/doctors${qs({ operation_id: operationId })}`,
  );

export const fetchAvailability = (
  hospitalId: string,
  operationId: string,
  doctorId: string,
  days = 14,
) =>
  request<AvailabilityDay[]>(
    `/hospitals/${hospitalId}/operations/${operationId}/doctors/${doctorId}/availability${qs({
      days: String(days),
    })}`,
  );

// ── Patient ───────────────────────────────────────────────────────────
export const createReservation = (
  token: string,
  body: {
    hospital_id: string;
    operation_id: string;
    doctor_id: string;
    date: string;
    time: string;
    notes?: string;
  },
) => request<SurgeryReservation>("/surgery-reservations", token, send("POST", body));

export const fetchMyReservations = (token: string) =>
  request<SurgeryReservation[]>("/surgery-reservations/me", token);

export const cancelReservation = (token: string, id: string) =>
  request<SurgeryReservation>(`/surgery-reservations/${id}/cancel`, token, send("PATCH"));

// ── Hospital account ──────────────────────────────────────────────────
export const fetchMyHospital = (token: string) => request<MyHospital>("/hospital/me", token);

export const updateMyHospital = (
  token: string,
  body: Partial<Pick<Hospital, "name" | "location" | "description" | "phone">>,
) => request<Hospital>("/hospital/me", token, send("PATCH", body));

export const searchDoctors = (token: string, q: string) =>
  request<HospitalDoctor[]>(`/hospital/doctors/search${qs({ q })}`, token);

export const inviteDoctor = (token: string, doctorId: string) =>
  request<HospitalLink>("/hospital/me/doctors", token, send("POST", { doctor_id: doctorId }));

export const removeDoctor = (token: string, doctorId: string) =>
  request<{ ok: true }>(`/hospital/me/doctors/${doctorId}`, token, send("DELETE"));

export const saveMyHospitalOverrides = (token: string, items: HospitalOverrideRow[]) =>
  request<HospitalOverrideRow[]>(
    "/hospital/me/overrides",
    token,
    send("PUT", {
      items: items.map(({ id: _id, ...row }) => ({
        ...row,
        start_time: row.is_closed ? null : row.start_time,
        end_time: row.is_closed ? null : row.end_time,
        slot_minutes: row.is_closed ? null : row.slot_minutes,
      })),
    }),
  );

export const saveMyHospitalSlots = (token: string, items: HospitalSlotRow[]) =>
  request<HospitalSlotRow[]>(
    "/hospital/me/slots",
    token,
    send("PUT", {
      items: items.map(({ operation_id, doctor_id, day_of_week, start_time, end_time, slot_minutes }) => ({
        operation_id,
        doctor_id,
        day_of_week,
        start_time,
        end_time,
        slot_minutes,
      })),
    }),
  );

export const decideSlots = (token: string, ids: string[], status: "approved" | "rejected") =>
  request<HospitalSlotRow[]>("/hospital/me/slots", token, send("PATCH", { ids, status }));

/** Catalog + this hospital's own custom surgeries. */
export const fetchHospitalOperations = (token: string) =>
  request<SurgicalOperation[]>("/hospital/me/operations", token);

/** Adds a surgery missing from the catalog (returns the existing one if the name matches). */
export const createHospitalOperation = (
  token: string,
  body: { speciality_id: string; name_en: string },
) => request<SurgicalOperation>("/hospital/me/operations", token, send("POST", body));

export const setHospitalSurgery = (token: string, operationId: string, doctorIds: string[]) =>
  request<HospitalSurgeryRow[]>(
    `/hospital/me/surgeries/${operationId}`,
    token,
    send("PUT", { doctor_ids: doctorIds }),
  );

export const removeHospitalSurgery = (token: string, operationId: string) =>
  request<{ ok: true }>(`/hospital/me/surgeries/${operationId}`, token, send("DELETE"));

export const fetchHospitalReservations = (token: string) =>
  request<SurgeryReservation[]>("/hospital/me/reservations", token);

export const decideReservation = (token: string, id: string, status: "approved" | "rejected") =>
  request<SurgeryReservation>(`/hospital/me/reservations/${id}`, token, send("PATCH", { status }));

// ── Doctor ────────────────────────────────────────────────────────────
export const fetchDoctorLinks = (token: string) =>
  request<HospitalLink[]>("/doctor/hospital-links", token);

export const respondToLink = (token: string, hospitalId: string, status: "approved" | "rejected") =>
  request<HospitalLink>(`/doctor/hospital-links/${hospitalId}`, token, send("PATCH", { status }));

/** Surgeries the doctor is assigned to at a hospital. */
export const fetchDoctorSurgeries = (token: string, hospitalId: string) =>
  request<SurgicalOperation[]>(`/doctor/hospitals/${hospitalId}/surgeries`, token);

export const fetchDoctorSlots = (token: string, hospitalId: string) =>
  request<HospitalSlotRow[]>(`/doctor/hospitals/${hospitalId}/slots`, token);

/** Adds dated proposals (pending until the hospital approves). */
export const proposeDoctorSlots = (
  token: string,
  hospitalId: string,
  items: { operation_id: string; date: string; start_time: string; end_time: string; slot_minutes: number }[],
) => request<HospitalSlotRow[]>(`/doctor/hospitals/${hospitalId}/slots`, token, send("PUT", { items }));

export const deleteDoctorProposal = (token: string, hospitalId: string, id: string) =>
  request<{ ok: true }>(`/doctor/hospitals/${hospitalId}/slots/${id}`, token, send("DELETE"));

export const doctorDecideReservation = (token: string, id: string, status: "approved" | "rejected") =>
  request<SurgeryReservation>(`/doctor/surgery-reservations/${id}`, token, send("PATCH", { status }));

export const fetchDoctorReservations = (token: string) =>
  request<SurgeryReservation[]>("/doctor/surgery-reservations", token);

// ── Admin ─────────────────────────────────────────────────────────────
export const adminFetchOperations = (token: string) =>
  request<SurgicalOperation[]>("/admin/surgical-operations", token);

export const adminSaveOperation = (
  token: string,
  body: Pick<SurgicalOperation, "name_en" | "name_ar" | "speciality_id" | "is_active">,
  id?: string,
) =>
  request<SurgicalOperation>(
    id ? `/admin/surgical-operations/${id}` : "/admin/surgical-operations",
    token,
    send(id ? "PATCH" : "POST", body),
  );

export const adminDeleteOperation = (token: string, id: string) =>
  request<{ ok: true }>(`/admin/surgical-operations/${id}`, token, send("DELETE"));

export const adminFetchHospitals = (token: string) =>
  request<Hospital[]>("/admin/hospitals", token);

export const adminSaveHospital = (
  token: string,
  body: Partial<Pick<Hospital, "name" | "location" | "description" | "phone" | "is_active" | "approval_status">> & {
    /** Create only: makes a hospital login with the default password. */
    email?: string;
  },
  id?: string,
) =>
  request<Hospital & { default_password?: string | null }>(
    id ? `/admin/hospitals/${id}` : "/admin/hospitals",
    token,
    send(id ? "PATCH" : "POST", body),
  );

export const adminDeleteHospital = (token: string, id: string) =>
  request<{ ok: true }>(`/admin/hospitals/${id}`, token, send("DELETE"));

/** Next `days` calendar dates as YYYY-MM-DD (local time). */
export function upcomingDates(days = 14, from = new Date()): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}
