import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  consumeGoogleConsent,
  consumeGoogleReturnTo,
  consumeGoogleSignupRole,
  consumeGoogleState,
  googleRedirectUri,
  startGoogleSignIn,
} from "@/domains/auth/google";
import {
  googleNoAccountPayload,
  navigateAfterGoogleLogin,
  navigateGoogleNoAccount,
} from "@/domains/auth/googleAuthFlow";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

/**
 * Where Google sends the browser back. Reads the one-time code from the query,
 * hands it to the API for the token exchange, then lands the user in the app.
 */
export default function GoogleCallbackScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const [error, setError] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  // React 18 double-invokes effects in dev; a code may only be redeemed once.
  const startedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "web" || startedRef.current) return;
    startedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const denied = params.get("error");
    const code = params.get("code");
    const returnTo = consumeGoogleReturnTo();
    const medicalRecordsConsent = consumeGoogleConsent();
    const signupRole = consumeGoogleSignupRole();

    if (denied) {
      setError(isRTL ? "تم إلغاء تسجيل الدخول." : "Sign-in was cancelled.");
      return;
    }
    if (!consumeGoogleState(params.get("state"))) {
      setError(isRTL ? "طلب غير صالح." : "This sign-in request is not valid.");
      return;
    }
    if (!code) {
      setError(isRTL ? "لم يصل رمز من Google." : "Google sent no sign-in code.");
      return;
    }

    void loginWithGoogle({
      code,
      redirectUri: googleRedirectUri(),
      medicalRecordsConsent,
    })
      .then(() => navigateAfterGoogleLogin(router, returnTo ?? undefined))
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : "Google sign-in failed";
        const payload = googleNoAccountPayload(e, signupRole ?? undefined);
        if (payload) {
          navigateGoogleNoAccount(router, payload);
          return;
        }
        setError(message);
      });
  }, [isRTL, loginWithGoogle]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {needsConsent ? (
        <>
          <Text style={[styles.error, { color: colors.foreground }]}>
            {isRTL
              ? "أوافق على قيام 3elagi بتخزين سجلاتي الطبية في قاعدة بياناته لتقديم الخدمات الصحية، وفقاً للائحة العامة لحماية البيانات (GDPR)."
              : "I consent to 3elagi storing my medical records in its database to provide healthcare services, in accordance with GDPR."}
          </Text>
          <Pressable
            onPress={() => startGoogleSignIn({ medicalRecordsConsent: true })}
            style={({ pressed }) => [
              styles.agreeBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.92 : 1 },
            ]}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
              {isRTL ? "أوافق ومتابعة" : "Agree and continue"}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.replace("/auth/login")}>
            <Text style={{ color: colors.mutedForeground }}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Text>
          </Pressable>
        </>
      ) : error ? (
        <>
          <Text style={[styles.error, { color: colors.foreground }]}>{error}</Text>
          <Pressable onPress={() => router.replace("/auth/login")}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              {t.auth.logIn}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {isRTL ? "جاري تسجيل الدخول…" : "Signing you in…"}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  hint: { fontSize: 14 },
  error: { fontSize: 15, fontWeight: "600", textAlign: "center" },
  agreeBtn: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
