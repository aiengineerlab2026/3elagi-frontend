import { API_BASE } from "@/constants/api";
import { uploadFile } from "@/domains/medical";
import {
  ensureWebAccessToken,
  setWebAccessToken,
  setWebAuthMode,
  usesBearerTokenAuth,
  withAuthRequestInit,
} from "@/domains/auth/http";
import { resolveInitialDemoSlot } from "@/domains/auth/demoSession";
import type { AuthSession, Credentials, DoctorApprovalStatus, PreferredLocale, SignupInput, SignupFile } from "./types";
import type {
  MarketingEmailLanguage,
  MarketingEmailTheme,
} from "@/domains/admin/api";
import type { MarketingEmailSection } from "@/domains/admin/marketingSections";
import { assertAdminClientAccess } from "@/domains/admin/guard";

export class AuthApiError extends Error {
  code?: string;
  email?: string;
  /** Verified display name, when the API knows one (e.g. from Google). */
  name_?: string;
  status: number;

  constructor(
    message: string,
    opts?: { code?: string; email?: string; name?: string; status?: number },
  ) {
    super(message);
    this.name = "AuthApiError";
    this.code = opts?.code;
    this.email = opts?.email;
    this.name_ = opts?.name;
    this.status = opts?.status ?? 400;
  }
}

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(
    `${API_BASE}${path}`,
    withAuthRequestInit(null, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const nested =
      data?.message && typeof data.message === "object" && !Array.isArray(data.message)
        ? data.message
        : null;
    const msg =
      (typeof data?.message === "string"
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join(", ")
          : nested?.message) ??
      data?.error ??
      `Request failed (${res.status})`;
    throw new AuthApiError(String(msg), {
      code: nested?.code ?? data?.code,
      email: nested?.email ?? data?.email,
      name: nested?.name ?? data?.name,
      status: res.status,
    });
  }
  return data as T;
}

async function authPatch<T>(path: string, token: string, body: object): Promise<T> {
  const res = await fetch(
    `${API_BASE}${path}`,
    withAuthRequestInit(token, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ??
        data?.error ??
        `Request failed (${res.status})`,
    );
  }
  return data as T;
}

async function authPost<T>(path: string, token: string, body: object): Promise<T> {
  const res = await fetch(
    `${API_BASE}${path}`,
    withAuthRequestInit(token, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ??
        data?.error ??
        `Request failed (${res.status})`,
    );
  }
  return data as T;
}

interface RawAuthResponse {
  access_token?: string;
  refresh_token?: string;
  role: string;
  user_id: string;
  profile: Record<string, unknown>;
  preferred_locale?: PreferredLocale | null;
  email_verified?: boolean;
}

function doctorSpecialtyFromProfile(profile: Record<string, unknown>): {
  specialty?: string;
  specialityId?: string;
} {
  const speciality = profile.speciality as
    | { id?: string; name_en?: string; name_ar?: string }
    | undefined;
  const specialty = String(
    profile.professional_title ?? speciality?.name_en ?? "",
  ).trim();
  const specialityId = profile.speciality_id
    ? String(profile.speciality_id)
    : speciality?.id
      ? String(speciality.id)
      : undefined;
  return {
    specialty: specialty || undefined,
    specialityId,
  };
}

function readDoctorApprovalStatus(
  profile: Record<string, unknown>,
): DoctorApprovalStatus | null {
  const status = profile.approval_status;
  if (status === "pending" || status === "approved" || status === "rejected") {
    return status;
  }
  return null;
}

function normalizeProfile(
  raw: Record<string, unknown>,
  fallbackEmail: string,
  photoOverride?: string,
) {
  return {
    id: String(raw.user_id ?? raw.id ?? raw._id ?? ""),
    name: String(raw.name ?? raw.full_name ?? ""),
    email: String(raw.email ?? fallbackEmail),
    phone: raw.phone ? String(raw.phone) : undefined,
    country: raw.country ? String(raw.country).toUpperCase() : undefined,
    avatarUrl: photoOverride
      ?? (raw.photo_url
        ? String(raw.photo_url)
        : raw.avatar_url
          ? String(raw.avatar_url)
          : undefined),
    createdAt: String(
      raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    ),
  };
}

function toSession(raw: RawAuthResponse, fallbackEmail: string, photoUrl?: string): AuthSession {
  const profile = raw.profile ?? {};
  const isDoctor = raw.role?.toLowerCase() === "doctor";
  const isAdmin = raw.role?.toLowerCase() === "admin";
  const { specialty, specialityId } = isDoctor
    ? doctorSpecialtyFromProfile(profile)
    : {};
  return {
    accessToken: raw.access_token ?? "",
    refreshToken: raw.refresh_token,
    role: raw.role,
    userId: raw.user_id,
    preferredLocale: raw.preferred_locale ?? null,
    emailVerified: raw.email_verified !== false,
    doctorId: isDoctor ? String(profile.id ?? "") : undefined,
    specialty,
    specialityId,
    doctorApprovalStatus: isDoctor ? readDoctorApprovalStatus(profile) : null,
    profile: normalizeProfile(
      {
        ...profile,
        user_id: isDoctor || isAdmin ? raw.user_id : profile.user_id ?? raw.user_id,
        name: isAdmin ? "Admin" : profile.name,
        email: isAdmin ? fallbackEmail : profile.email,
      },
      fallbackEmail,
      photoUrl,
    ),
  };
}

async function uploadSignupFile(file: SignupFile, token: string): Promise<string> {
  const result = await uploadFile(file.uri, file.mimeType, file.fileName, token);
  return result.url;
}

async function applySignupUploads(
  input: SignupInput,
  token: string,
  isDoctor: boolean,
): Promise<string | undefined> {
  let photoUrl: string | undefined;

  if (input.photo) {
    photoUrl = await uploadSignupFile(input.photo, token);
    await authPatch("/users/me", token, { photo_url: photoUrl });
    if (isDoctor) {
      await authPatch("/doctors/me", token, { photo_url: photoUrl });
    } else {
      await authPatch("/patient", token, { photo_url: photoUrl });
    }
  }

  if (isDoctor && (input.graduationCert || input.workPermit)) {
    const patch: Record<string, string> = {};
    if (input.graduationCert) {
      patch.graduation_cert_url = await uploadSignupFile(input.graduationCert, token);
    }
    if (input.workPermit) {
      patch.work_permit_url = await uploadSignupFile(input.workPermit, token);
    }
    await authPatch("/doctors/me", token, patch);
  }

  return photoUrl;
}

async function finalizeSession(session: AuthSession): Promise<AuthSession> {
  if (resolveInitialDemoSlot()) {
    setWebAuthMode("token");
    if (!session.accessToken?.trim()) {
      throw new Error("Could not establish session. Please try again.");
    }
    setWebAccessToken(session.accessToken);
    return session;
  }

  if (usesBearerTokenAuth()) {
    if (!session.accessToken?.trim()) {
      throw new Error("Could not establish session. Please try again.");
    }
    setWebAccessToken(session.accessToken);
    return session;
  }

  const token = await ensureWebAccessToken({ logoutOnFailure: false });
  if (token) {
    return { ...session, accessToken: token };
  }

  // Incognito / blocked third-party cookies — use tokens from the login response.
  if (session.accessToken?.trim() && session.refreshToken?.trim()) {
    setWebAuthMode("token");
    setWebAccessToken(session.accessToken);
    return session;
  }

  throw new Error("Could not establish session. Please try again.");
}

export const authRepository = {
  /**
   * Google sign-in. The browser only ever holds the one-time `code`; the API
   * swaps it for tokens using the client secret, which never reaches the app.
   */
  async loginWithGoogle(input: {
    code: string;
    redirectUri: string;
    medicalRecordsConsent?: boolean;
  }): Promise<AuthSession> {
    const raw = await post<RawAuthResponse>("/auth/google", {
      code: input.code,
      redirect_uri: input.redirectUri,
      medical_records_storage_consent: input.medicalRecordsConsent ?? false,
    });
    return finalizeSession(toSession(raw, ""));
  },

  /** Native: the device already holds a verified ID token, no code exchange. */
  async loginWithGoogleIdToken(input: {
    idToken: string;
    medicalRecordsConsent?: boolean;
  }): Promise<AuthSession> {
    const raw = await post<RawAuthResponse>("/auth/google", {
      id_token: input.idToken,
      medical_records_storage_consent: input.medicalRecordsConsent ?? false,
    });
    return finalizeSession(toSession(raw, ""));
  },

  async login(creds: Credentials): Promise<AuthSession> {
    const email = creds.email.trim().toLowerCase();
    try {
      const raw = await post<RawAuthResponse>("/auth/login", {
        email,
        password: creds.password,
      });
      return finalizeSession(toSession(raw, email));
    } catch (e) {
      if (e instanceof AuthApiError && e.code === "EMAIL_NOT_VERIFIED") {
        throw new AuthApiError(e.message, {
          code: "EMAIL_NOT_VERIFIED",
          email: e.email ?? email,
          status: e.status,
        });
      }
      throw e;
    }
  },

  async signup(input: SignupInput): Promise<AuthSession> {
    const isDoctor = input.role === "doctor";
    const email = input.email.trim().toLowerCase();

    const raw = input.role === "hospital"
      ? await post<RawAuthResponse>("/auth/register/hospital", {
          email,
          password: input.password,
          name: input.name.trim(),
          phone: input.phone ?? "",
          location: input.location?.trim() ?? "",
          description: input.description?.trim() ?? "",
        })
      : isDoctor
      ? await post<RawAuthResponse>("/auth/register/doctor", {
          email,
          password: input.password,
          name: input.name.trim(),
          phone: input.phone ?? "",
          country: (input.country ?? "EG").trim().toUpperCase(),
          speciality_id: input.specialityId,
          consultation_price: input.consultationPrice ?? 1,
          text_price_local: input.textPriceLocal ?? undefined,
          text_price_usd: input.textPriceUsd ?? undefined,
          video_price_local: input.videoPriceLocal ?? undefined,
          video_price_usd: input.videoPriceUsd ?? undefined,
          payment_link: input.paymentLink?.trim() || undefined,
          clinic_location: input.clinicLocation?.trim() || undefined,
        })
      : await post<RawAuthResponse>("/auth/register/patient", {
          email,
          password: input.password,
          name: input.name.trim(),
          phone: input.phone ?? "",
          country: (input.country ?? "EG").trim().toUpperCase(),
          medical_records_storage_consent:
            input.medicalRecordsStorageConsent === true,
        });

    let session = await finalizeSession(toSession(raw, email));

    const uploadToken = session.accessToken || "";
    const photoUrl = uploadToken
      ? await applySignupUploads(input, uploadToken, isDoctor).catch(() => undefined)
      : undefined;

    if (photoUrl) {
      session = {
        ...session,
        profile: { ...session.profile, avatarUrl: photoUrl },
      };
    }

    return session;
  },

  async createAdminDoctor(
    adminToken: string,
    input: SignupInput,
    welcomeEmail?: {
      send: boolean;
      language: MarketingEmailLanguage;
      themeColor?: MarketingEmailTheme;
      sections?: MarketingEmailSection[];
    },
  ): Promise<{ welcomeEmailOk?: boolean; welcomeEmailError?: string }> {
    assertAdminClientAccess();
    const email = input.email.trim().toLowerCase();
    const raw = await authPost<RawAuthResponse & {
      welcome_email?: { ok: boolean; error?: string };
    }>("/admin/doctors", adminToken, {
      email,
      password: input.password,
      name: input.name.trim(),
      phone: input.phone ?? "",
      country: (input.country ?? "EG").trim().toUpperCase(),
      speciality_id: input.specialityId,
      consultation_price: input.consultationPrice ?? 1,
      text_price_local: input.textPriceLocal ?? undefined,
      text_price_usd: input.textPriceUsd ?? undefined,
      video_price_local: input.videoPriceLocal ?? undefined,
      video_price_usd: input.videoPriceUsd ?? undefined,
      payment_link: input.paymentLink?.trim() || undefined,
      clinic_location: input.clinicLocation?.trim() || undefined,
      send_welcome_email: welcomeEmail?.send === true,
      welcome_email_language: welcomeEmail?.language,
      welcome_email_theme: welcomeEmail?.themeColor,
      welcome_email_sections: welcomeEmail?.sections,
    });
    const uploadToken = raw.access_token || "";
    if (uploadToken) {
      await applySignupUploads(input, uploadToken, true).catch(() => undefined);
    }
    const welcome = raw.welcome_email;
    return {
      welcomeEmailOk: welcome?.ok,
      welcomeEmailError: welcome?.error,
    };
  },

  async verifyEmail(email: string, code: string): Promise<AuthSession> {
    const normalized = email.trim().toLowerCase();
    const raw = await post<RawAuthResponse>("/auth/verify-email", {
      email: normalized,
      code: code.trim(),
    });
    return finalizeSession(toSession(raw, normalized));
  },

  async resendVerification(email: string): Promise<void> {
    await post("/auth/resend-verification", {
      email: email.trim().toLowerCase(),
    });
  },

  async forgotPassword(email: string): Promise<void> {
    await post("/auth/forgot-password", {
      email: email.trim().toLowerCase(),
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await post("/auth/reset-password", {
      token: token.trim(),
      new_password: newPassword,
    });
  },

  async changePassword(
    token: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await authPost("/auth/change-password", token, {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};
