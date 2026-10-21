import {
  GoogleSignin,
  statusCodes,
  type SignInResponse,
} from "@react-native-google-signin/google-signin";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import { GOOGLE_CLIENT_ID } from "@/domains/auth/google";

/**
 * Native OAuth client (Android/iOS). Must be listed in the API's allowed
 * audiences — see GOOGLE_CLIENT_MOBILE_ID / GOOGLE_MOBILE_CLIENT_ID on Cloud Run.
 */
export const GOOGLE_CLIENT_MOBILE_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_MOBILE_ID ??
  "773972750372-8ggmkp52i76ruevgvtpo0ummg1vttdeo.apps.googleusercontent.com";

export type GoogleNativePromptResult =
  | { type: "success" }
  | { type: "cancel" }
  | { type: "error"; error: Error };

let configured = false;

function ensureConfigured(): void {
  if (configured || Platform.OS === "web") return;
  GoogleSignin.configure({
    // Android needs the *web* client id here so the returned ID token `aud`
    // matches what the API already accepts for browser sign-in.
    webClientId: GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    offlineAccess: false,
    scopes: ["openid", "email", "profile"],
  });
  configured = true;
}

async function idTokenFromSignIn(result: SignInResponse): Promise<string> {
  if (result.type === "cancelled") {
    throw Object.assign(new Error("Sign-in cancelled"), { code: "cancelled" });
  }
  if (result.data.idToken) return result.data.idToken;
  const tokens = await GoogleSignin.getTokens();
  if (tokens.idToken) return tokens.idToken;
  throw new Error("Google returned no identity token");
}

/**
 * Native Google sign-in via the platform SDK (no in-app browser redirect).
 * Avoids Custom Tabs getting stuck after Google redirects on Android.
 */
export function useGoogleNativeSignIn(onIdToken: (idToken: string) => void) {
  const [ready, setReady] = useState(Platform.OS === "web");

  useEffect(() => {
    if (Platform.OS === "web") return;
    ensureConfigured();
    setReady(true);
  }, []);

  const promptAsync = useCallback(async (): Promise<GoogleNativePromptResult> => {
    ensureConfigured();
    try {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const result = await GoogleSignin.signIn();
      const idToken = await idTokenFromSignIn(result);
      onIdToken(idToken);
      return { type: "success" };
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (
        err.code === statusCodes.SIGN_IN_CANCELLED ||
        err.code === "cancelled"
      ) {
        return { type: "cancel" };
      }
      return {
        type: "error",
        error: new Error(err.message ?? "Google sign-in failed"),
      };
    }
  }, [onIdToken]);

  return { ready, promptAsync };
}
