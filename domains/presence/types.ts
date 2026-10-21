export interface LoggedInUser {
  id: string;
  name: string;
  email?: string;
  role: string;
  photo_url?: string | null;
  specialty?: string | null;
  speciality_id?: string | null;
  doctor_id?: string | null;
}
