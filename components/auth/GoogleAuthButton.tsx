import { router } from "expo-router";
import { Check } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { startGoogleSignIn } from "@/domains/auth/google";
import {
  googleNoAccountPayload,
  navigateAfterGoogleLogin,
  navigateGoogleNoAccount,
  type GoogleNoAccountPayload,
} from "@/domains/auth/googleAuthFlow";
import { useGoogleNativeSignIn } from "@/domains/auth/googleNative";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { flexRow } from "@/utils/rtl";

/** Google's four-colour "G". Fixed brand colours — not themed. */
function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z"
      />
      <Path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.4v5.7C7.9 41.1 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.7 28.1c-.4-1.3-.7-2.7-.7-4.1s.2-2.8.7-4.1v-5.7H4.4C2.9 17.1 2 20.4 2 24s.9 6.9 2.4 9.8l7.3-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 30 2 24 2 15.4 2 7.9 6.9 4.4 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.3-9.1z"
      />
    </Svg>
  );
}

/**
 * One button for both screens: Google sign-in signs the account in when the
 * email is known and creates a patient account when it is not, so login and
 * signup need no separate flows.
 */
export function GoogleAuthButton({
  returnTo,
  requireConsent = false,
  dividerBelow = false,
  signupRole,
  onConsentChange,
  onAccountNotFound,
}: {
  returnTo?: string;
  /** Signup surfaces: GDPR consent must be ticked before Google is opened. */
  requireConsent?: boolean;
  /** Signup puts Google first, so its "or" rule sits under the button. */
  dividerBelow?: boolean;
  /** "patient" | "doctor" — returned to the signup form after the round trip. */
  signupRole?: string;
  /** Lets the host screen unlock its own form on the same consent. */
  onConsentChange?: (consented: boolean) => void;
  /** Welcome/signup inline: stay on screen and prefill instead of opening /auth/signup. */
  onAccountNotFound?: (payload: GoogleNoAccountPayload) => void;
}) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const [consented, setConsented] = useState(false);
  const blocked = requireConsent && !consented;
  const isWeb = Platform.OS === "web";

  const loginWithGoogleIdToken = useAuthStore((s) => s.loginWithGoogleIdToken);
  const loading = useAuthStore((s) => s.loading);

  // Native: the device gets an ID token straight from Google; unknown emails
  // land on the signup form exactly as the web callback does.
  const onIdToken = useCallback(
    (idToken: string) => {
      void loginWithGoogleIdToken({
        idToken,
        medicalRecordsConsent: requireConsent && consented,
      })
        .then(() => navigateAfterGoogleLogin(router, returnTo))
        .catch((e: unknown) => {
          const payload = googleNoAccountPayload(e, signupRole);
          if (payload) {
            navigateGoogleNoAccount(router, payload, onAccountNotFound);
            return;
          }
          const message = (e as Error).message;
          if (message === "__UNSUPPORTED_ROLE__") {
            Alert.alert(
              "Google",
              isRTL
                ? "نوع الحساب غير مدعوم على تطبيق الجوال."
                : "This account type is not supported in the mobile app.",
            );
            return;
          }
          Alert.alert("Google", message);
        });
    },
    [
      consented,
      loginWithGoogleIdToken,
      onAccountNotFound,
      requireConsent,
      returnTo,
      signupRole,
    ],
  );

  const native = useGoogleNativeSignIn(onIdToken);
  if (!isWeb && !native.ready) return null;

  const divider = (
    <View style={[styles.dividerRow, { flexDirection: flexRow(isRTL) }]}>
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
      <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
        {isRTL ? "أو" : "or"}
      </Text>
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
    </View>
  );

  return (
    <View style={styles.wrap}>
      {dividerBelow ? null : divider}

      {requireConsent ? (
        <Pressable
          onPress={() =>
            setConsented((value) => {
              onConsentChange?.(!value);
              return !value;
            })
          }
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consented }}
          style={[styles.consentRow, { flexDirection: flexRow(isRTL) }]}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: consented ? colors.primary : colors.border,
                backgroundColor: consented ? colors.primary : "transparent",
              },
            ]}
          >
            {consented ? <Check size={13} color={colors.primaryForeground} strokeWidth={3} /> : null}
          </View>
          <Text style={[styles.consentText, { color: colors.mutedForeground }]}>
            {isRTL
              ? "أوافق على قيام 3elagi بتخزين سجلاتي الطبية في قاعدة بياناته لتقديم الخدمات الصحية، وفقاً للائحة العامة لحماية البيانات (GDPR)."
              : "I consent to 3elagi storing my medical records in its database to provide healthcare services, in accordance with GDPR."}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => {
          if (!isWeb) {
            void native.promptAsync().then((result) => {
              if (result?.type === "error") {
                Alert.alert(
                  "Google",
                  result.error.message ??
                    (isRTL ? "تعذر تسجيل الدخول عبر Google." : "Google sign-in failed."),
                );
              }
            });
            return;
          }
          startGoogleSignIn({
            returnTo,
            medicalRecordsConsent: requireConsent && consented,
            signupRole,
          });
        }}
        disabled={blocked || loading}
        accessibilityRole="button"
        accessibilityLabel={isRTL ? "المتابعة باستخدام Google" : "Continue with Google"}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.btn,
          {
            flexDirection: flexRow(isRTL),
            borderColor: colors.border,
            backgroundColor: pressed || hovered ? colors.muted : colors.card,
            opacity: blocked || loading ? 0.5 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.foreground} />
        ) : (
          <GoogleMark />
        )}
        <Text style={[styles.label, { color: colors.foreground }]}>
          {loading
            ? isRTL
              ? "جاري تسجيل الدخول…"
              : "Signing in…"
            : isRTL
              ? "المتابعة باستخدام Google"
              : "Continue with Google"}
        </Text>
      </Pressable>
      {dividerBelow ? divider : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: 12,
    marginTop: Platform.OS === "web" ? 14 : 6,
  },
  dividerRow: { alignItems: "center", gap: 10 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 12, fontWeight: "600" },
  btn: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  label: { fontSize: 15, fontWeight: "700" },
  consentRow: { alignItems: "flex-start", gap: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  consentText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
