import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AuthFormBody } from "@/components/auth/AuthFormBody";
import { AuthLanguageField } from "@/components/auth/AuthLanguageField";
import { AuthLoginBackground } from "@/components/auth/AuthLoginBackground";
import { AuthFormError, AuthFormField } from "@/components/auth/AuthFormField";
import { useAuthStore } from "@/domains/auth/store";
import { getPostLoginRoute } from "@/domains/auth/navigation";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { showSuccessToast } from "@/utils/toast";

function readParam(value?: string | string[]): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default function VerifyEmailScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isDesktop, isMobile } = useWebLayout();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const profileEmail = useAuthStore((s) => s.profile?.email);
  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const resendVerification = useAuthStore((s) => s.resendVerification);
  const loading = useAuthStore((s) => s.loading);
  const logout = useAuthStore((s) => s.logout);

  const email = useMemo(
    () => readParam(params.email) || profileEmail?.trim() || "",
    [params.email, profileEmail],
  );
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const hideIntro = Platform.OS === "web" && isDesktop;
  const hideWebTopBar = Platform.OS === "web";

  const submit = async () => {
    const trimmed = code.replace(/\D/g, "").slice(0, 4);
    if (!email) {
      setFormError(t.auth.invalidEmail);
      return;
    }
    if (trimmed.length !== 4) {
      setFormError(t.auth.verificationCodeInvalid);
      return;
    }
    setFormError(null);
    try {
      await verifyEmail(email, trimmed);
      const { role, doctorApprovalStatus } = useAuthStore.getState();
      router.replace(getPostLoginRoute(role, doctorApprovalStatus));
    } catch (e) {
      setFormError((e as Error).message || t.auth.verificationFailed);
    }
  };

  const resend = async () => {
    if (!email || resending) return;
    setResending(true);
    setFormError(null);
    try {
      await resendVerification(email);
      showSuccessToast(t.auth.verificationResent);
    } catch (e) {
      setFormError((e as Error).message || t.auth.genericError);
    } finally {
      setResending(false);
    }
  };

  const screen = (
    <View
      style={[
        styles.screen,
        { backgroundColor: "transparent" },
        Platform.OS === "web" && styles.screenWeb,
      ]}
    >
      {!hideWebTopBar ? (
        <View
          style={[
            styles.topBar,
            {
              // Native sits inside the auth card, which already clears the notch.
              paddingTop: Platform.OS === "web" ? 8 : 10,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <Pressable
            onPress={() => {
              logout();
              router.replace("/auth/login");
            }}
            style={{ padding: 6 }}
          >
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
          <AuthLanguageField />
        </View>
      ) : null}
      <AuthFormBody
        style={styles.flex}
        contentContainerStyle={[
          styles.body,
          Platform.OS === "web" && isMobile && styles.bodyMobileWeb,
        ]}
        bottomOffset={32}
      >
        {!hideIntro ? (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t.auth.verifyEmailTitle}
            </Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              {t.auth.verifyEmailSubtitle(email || "…")}
            </Text>
          </>
        ) : null}

        <View style={{ width: "100%", gap: 12, marginTop: hideIntro ? 0 : 28 }}>
          {formError ? <AuthFormError message={formError} colors={colors} /> : null}
          <AuthFormField
            label={t.auth.verificationCode}
            value={code}
            onChange={(value) => {
              setCode(value.replace(/\D/g, "").slice(0, 4));
              if (formError) setFormError(null);
            }}
            placeholder="1234"
            autoCapitalize="none"
            keyboardType="phone-pad"
            returnKeyType="go"
            onSubmitEditing={() => {
              if (!loading) void submit();
            }}
            colors={colors}
            isRTL={isRTL}
          />
          <Pressable
            onPress={() => void submit()}
            disabled={loading}
            style={[
              styles.btn,
              {
                backgroundColor: loading ? colors.mutedForeground : colors.primary,
                marginTop: 8,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{t.auth.verifyEmailAction}</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => void resend()}
            disabled={resending}
            style={{ paddingVertical: 8, alignItems: "center" }}
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              {resending ? t.auth.sending : t.auth.resendVerificationCode}
            </Text>
          </Pressable>
        </View>
      </AuthFormBody>
    </View>
  );

  if (Platform.OS === "web") return screen;
  return <AuthLoginBackground>{screen}</AuthLoginBackground>;
}

const styles = StyleSheet.create({
  // Content-sized on native: the auth card hugs the form, the shell scrolls.
  screen: { flexShrink: 1 },
  flex: { flex: 1 },
  screenWeb: { flex: 0, width: "100%", height: "auto" },
  topBar: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  body: {
    paddingHorizontal: Platform.OS === "web" ? 24 : 16,
    paddingTop: 12,
    alignItems: "center",
    paddingBottom: Platform.OS === "web" ? 32 : 24,
  },
  bodyMobileWeb: { paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 28, fontWeight: "800", textAlign: "center" },
  sub: { fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 },
  btn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
