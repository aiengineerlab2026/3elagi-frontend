import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AuthFormBody } from "@/components/auth/AuthFormBody";
import { AuthLoginBackground } from "@/components/auth/AuthLoginBackground";
import { AuthFormError, AuthFormField } from "@/components/auth/AuthFormField";
import { authRepository } from "@/domains/auth/repository";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { showSuccessToast } from "@/utils/toast";
import { AuthHomeLink } from "@/components/auth/AuthHomeLink";
import { AuthLanguageField } from "@/components/auth/AuthLanguageField";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isDesktop, isMobile } = useWebLayout();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const hideIntro = Platform.OS === "web" && isDesktop;
  const isNative = Platform.OS !== "web";

  const submit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setFormError(t.auth.invalidEmail);
      return;
    }
    setFormError(null);
    setLoading(true);
    try {
      await authRepository.forgotPassword(trimmed);
      setSent(true);
      showSuccessToast(t.auth.resetLinkSent);
    } catch (e) {
      setFormError((e as Error).message || t.auth.genericError);
    } finally {
      setLoading(false);
    }
  };

  const goBackToLogin = () => {
    if (isNative) {
      router.replace({ pathname: "/welcome", params: { panel: "login" } });
      return;
    }
    router.replace("/auth/login");
  };

  const screen = (
    <View
      style={[
        styles.screen,
        { backgroundColor: "transparent" },
        Platform.OS === "web" && styles.screenWeb,
      ]}
    >
      {Platform.OS === "web" ? (
        <View
          style={[
            styles.topBar,
            {
              paddingTop: 8,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <AuthHomeLink compact />
          <AuthLanguageField />
        </View>
      ) : null}
      <AuthFormBody
        style={styles.flex}
        contentContainerStyle={[
          styles.body,
          isNative && styles.bodyNative,
          Platform.OS === "web" && isMobile && styles.bodyMobileWeb,
          Platform.OS === "web" && !isMobile && styles.bodyDesktopWebCentered,
        ]}
        bottomOffset={32}
      >
        {!hideIntro ? (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t.auth.forgotPasswordTitle}
            </Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              {t.auth.forgotPasswordSubtitle}
            </Text>
          </>
        ) : null}

        <View style={[styles.form, hideIntro && styles.formNoIntro]}>
          {formError ? <AuthFormError message={formError} colors={colors} /> : null}
          {sent ? (
            <Text style={{ color: colors.foreground, textAlign: "center", lineHeight: 22 }}>
              {t.auth.resetLinkSentDetail}
            </Text>
          ) : (
            <>
              <AuthFormField
                label={t.auth.email}
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  if (formError) setFormError(null);
                }}
                placeholder={t.auth.emailPlaceholder}
                autoCapitalize="none"
                keyboardType="email-address"
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
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>{t.auth.sendResetLink}</Text>
                )}
              </Pressable>
            </>
          )}
          <Pressable onPress={goBackToLogin} style={styles.backLink}>
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>
              {t.auth.backToLogin}
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
  screen: { flexShrink: 1, width: "100%" },
  flex: { flex: 1 },
  screenWeb: { flex: 0, width: "100%", height: "auto" },
  topBar: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  body: {
    paddingHorizontal: Platform.OS === "web" ? 24 : 0,
    paddingTop: Platform.OS === "web" ? 12 : 0,
    alignItems: "stretch",
    paddingBottom: Platform.OS === "web" ? 32 : 0,
    width: "100%",
  },
  bodyNative: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  bodyMobileWeb: { paddingHorizontal: 16, paddingTop: 8 },
  bodyDesktopWebCentered: {
    flexGrow: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: Platform.OS === "web" ? 28 : 22,
    fontWeight: "800",
    textAlign: "center",
  },
  sub: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  form: {
    width: "100%",
    gap: 12,
    marginTop: 16,
  },
  formNoIntro: {
    marginTop: 0,
  },
  btn: {
    marginTop: 4,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  backLink: {
    paddingVertical: 12,
    alignItems: "center",
  },
});
