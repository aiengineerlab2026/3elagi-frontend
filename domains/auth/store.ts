import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { authRepository } from "./repository";
import { emit } from "@/utils/eventBus";
import { AUTH_EVENTS } from "./events";
import { applyLocaleAfterAuth } from "@/domains/i18n/store";
import {
  ensureDemoEmbedTokenAuthMode,
  ensureWebAccessToken,
  getWebAuthMode,
  logoutAuthSession,
  refreshAuthSession,
  usesCookieAuth,
} from "@/domains/auth/http";
import { logoutOnAuthFailure } from "@/domains/auth/sessionFailure";
import type { Credentials, DoctorApprovalStatus, PatientProfile, SignupInput } from "./types";
import type { WebViewAuthSession } from "@/constants/nativeWebViewBridge";
import { readAndStripSessionTransferFromUrl } from "@/domains/auth/sessionTransfer";
import {
  authPersistKeyForDemoSlot,
  clearDemoSlotPersistedAuth,
  persistDemoSlot,
  resolveInitialDemoSlot,
  stripDemoEmbedResetFromUrl,
} from "@/domains/auth/demoSession";

interface AuthState {
  profile: PatientProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  role: string | null;
  doctorId: string | null;
  specialty: string | null;
  specialityId: string | null;
  doctorApprovalStatus: DoctorApprovalStatus | null;
  emailVerified: boolean;
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  login: (c: Credentials) => Promise<void>;
  loginWithGoogle: (input: {
    code: string;
    redirectUri: string;
    medicalRecordsConsent?: boolean;
  }) => Promise<void>;
  loginWithGoogleIdToken: (input: {
    idToken: string;
    medicalRecordsConsent?: boolean;
  }) => Promise<void>;
  signup: (s: SignupInput) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  setEmailVerified: (verified: boolean) => void;
  logout: () => void;
  clearError: () => void;
  setProfile: (profile: PatientProfile) => void;
  setDoctorApprovalStatus: (status: DoctorApprovalStatus | null) => void;
  applyWebViewSession: (session: WebViewAuthSession) => void;
  clearWebViewSession: () => void;
}

function applySession(
  set: (partial: Partial<AuthState>) => void,
  session: Awaited<ReturnType<typeof authRepository.login>>,
) {
  set({
    profile: session.profile,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken ?? null,
    role: session.role,
    doctorId: session.doctorId ?? null,
    specialty: session.specialty ?? null,
    specialityId: session.specialityId ?? null,
    doctorApprovalStatus: session.doctorApprovalStatus ?? null,
    emailVerified: session.emailVerified !== false,
    loading: false,
  });
  applyLocaleAfterAuth(session.preferredLocale);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profile: null,
      accessToken: null,
      refreshToken: null,
      role: null,
      doctorId: null,
      specialty: null,
      specialityId: null,
      doctorApprovalStatus: null,
      emailVerified: true,
      loading: false,
      error: null,
      hydrated: false,
      login: async (creds) => {
        set({ loading: true, error: null });
        try {
          const session = await authRepository.login(creds);
          const role = session.role.toLowerCase();
          if (!["patient", "doctor", "admin", "hospital"].includes(role)) {
            set({ loading: false });
            throw new Error("__UNSUPPORTED_ROLE__");
          }
          applySession(set, session);
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
          throw e;
        }
      },
      loginWithGoogle: async (input) => {
        set({ loading: true, error: null });
        try {
          applySession(set, await authRepository.loginWithGoogle(input));
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
          throw e;
        }
      },
      loginWithGoogleIdToken: async (input) => {
        set({ loading: true, error: null });
        try {
          const session = await authRepository.loginWithGoogleIdToken(input);
          const role = session.role.toLowerCase();
          if (!["patient", "doctor", "admin", "hospital"].includes(role)) {
            set({ loading: false });
            throw new Error("__UNSUPPORTED_ROLE__");
          }
          applySession(set, session);
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
          throw e;
        }
      },
      signup: async (input) => {
        set({ loading: true, error: null });
        try {
          const session = await authRepository.signup(input);
          applySession(set, session);
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
          throw e;
        }
      },
      verifyEmail: async (email, code) => {
        set({ loading: true, error: null });
        try {
          const session = await authRepository.verifyEmail(email, code);
          applySession(set, { ...session, emailVerified: true });
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
          throw e;
        }
      },
      resendVerification: async (email) => {
        await authRepository.resendVerification(email);
      },
      setEmailVerified: (verified) => set({ emailVerified: verified }),
      logout: () => {
        const { refreshToken } = useAuthStore.getState();
        void logoutAuthSession(refreshToken);
        const userId = useAuthStore.getState().profile?.id;
        set({
          profile: null,
          accessToken: null,
          refreshToken: null,
          role: null,
          doctorId: null,
          specialty: null,
          specialityId: null,
          doctorApprovalStatus: null,
          emailVerified: true,
          error: null,
        });
        emit(AUTH_EVENTS.LOGOUT, { userId });
      },
      clearError: () => set({ error: null }),
      setProfile: (profile) => set({ profile }),
      setDoctorApprovalStatus: (status) => set({ doctorApprovalStatus: status }),
      applyWebViewSession: (session) => {
        set({
          profile: session.profile,
          accessToken: session.accessToken,
          role: session.role,
          doctorId: session.doctorId,
          specialty: session.specialty,
          specialityId: session.specialityId,
          doctorApprovalStatus: session.doctorApprovalStatus,
          emailVerified: session.emailVerified !== false,
          hydrated: true,
          error: null,
        });
      },
      clearWebViewSession: () => {
        const userId = useAuthStore.getState().profile?.id;
        set({
          profile: null,
          accessToken: null,
          refreshToken: null,
          role: null,
          doctorId: null,
          specialty: null,
          specialityId: null,
          doctorApprovalStatus: null,
          emailVerified: true,
          error: null,
        });
        emit(AUTH_EVENTS.LOGOUT, { userId });
      },
    }),
    {
      name: authPersistKeyForDemoSlot(resolveInitialDemoSlot()),
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => {
        const shared = {
          profile: s.profile,
          role: s.role,
          doctorId: s.doctorId,
          specialty: s.specialty,
          specialityId: s.specialityId,
          doctorApprovalStatus: s.doctorApprovalStatus,
          emailVerified: s.emailVerified,
        };
        if (usesCookieAuth()) return shared;
        return {
          ...shared,
          accessToken: s.accessToken,
          refreshToken: s.refreshToken,
        };
      },
      onRehydrateStorage: () => (state) => {
        // Demo iframe panels use namespaced storage keys.
        if (state && Platform.OS === "web") {
          ensureDemoEmbedTokenAuthMode();
          const slot = resolveInitialDemoSlot();
          if (slot) {
            persistDemoSlot(slot);
            if (stripDemoEmbedResetFromUrl()) {
              clearDemoSlotPersistedAuth(slot);
              state.profile = null;
              state.accessToken = null;
              state.role = null;
              state.doctorId = null;
              state.specialty = null;
              state.specialityId = null;
              state.doctorApprovalStatus = null;
              state.emailVerified = true;
            }
          }
          const transferred = readAndStripSessionTransferFromUrl();
          if (transferred) {
            state.profile = transferred.profile;
            state.accessToken = transferred.accessToken;
            state.role = transferred.role;
            state.doctorId = transferred.doctorId;
            state.specialty = transferred.specialty;
            state.specialityId = transferred.specialityId;
            state.doctorApprovalStatus = transferred.doctorApprovalStatus;
            state.emailVerified = transferred.emailVerified !== false;
          }
        }
        // `accessToken` is not persisted under cookie auth, so on a page reload
        // it has to come back from the cookie before anything reads it — the
        // API modules all send it as a Bearer header. Hydrating first would let
        // that first render fire unauthenticated requests.
        if (state && Platform.OS === "web" && getWebAuthMode() === "token" && state.refreshToken) {
          void refreshAuthSession(state.refreshToken)
            .then(({ accessToken, refreshToken }) =>
              useAuthStore.setState({
                accessToken: accessToken ?? null,
                refreshToken: refreshToken ?? state.refreshToken,
              }),
            )
            .catch(() => logoutOnAuthFailure())
            .finally(() => useAuthStore.setState({ hydrated: true }));
          return;
        }
        if (state && usesCookieAuth() && state.profile) {
          void ensureWebAccessToken()
            .then((token) => useAuthStore.setState({ accessToken: token ?? null }))
            .catch(() => logoutOnAuthFailure())
            .finally(() => useAuthStore.setState({ hydrated: true }));
          return;
        }
        if (state && !usesCookieAuth() && state.refreshToken) {
          void refreshAuthSession(state.refreshToken)
            .then(({ accessToken, refreshToken }) =>
              useAuthStore.setState({
                accessToken: accessToken ?? null,
                refreshToken: refreshToken ?? state.refreshToken,
              }),
            )
            .catch(() => logoutOnAuthFailure())
            .finally(() => useAuthStore.setState({ hydrated: true }));
          return;
        }
        if (state) state.hydrated = true;
      },
    },
  ),
);
