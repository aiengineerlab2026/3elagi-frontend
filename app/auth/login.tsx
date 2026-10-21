import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";

import { AuthFormBody } from "@/components/auth/AuthFormBody";
import { AuthHomeLink } from "@/components/auth/AuthHomeLink";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { AuthLanguageField } from "@/components/auth/AuthLanguageField";
import { AuthLoginBackground } from "@/components/auth/AuthLoginBackground";
import { AuthFormError, AuthFormField } from "@/components/auth/AuthFormField";
import { useAuthStore } from "@/domains/auth/store";
import { getPostLoginRoute } from "@/domains/auth/navigation";
import {
  hasFieldErrors,
  validateLoginFields,
  type LoginFieldErrors,
} from "@/domains/auth/validation";
import { useAccentGradient, useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";

export default function LoginScreen() {
  const colors = useColors();
  const accentGradient = useAccentGradient();
  const { t, isRTL } = useI18n();
  const { isDesktop, isMobile } = useWebLayout();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const isWeb = Platform.OS === "web";
  /** Desktop web: show title only (hero image carries branding). */
  const showTitle = true;
  const showSubtitle = !(isWeb && isDesktop);
  const showWebTopBar = isWeb;

  const submit = async () => {
    const errors = validateLoginFields(email, password, t.auth);
    if (hasFieldErrors(errors)) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);

    try {
      await login({ email: email.trim(), password });
      const { role, doctorApprovalStatus } = useAuthStore.getState();

      router.replace(getPostLoginRoute(role, doctorApprovalStatus));
    } catch (e) {
      const message = (e as Error).message;
      if (message === "__UNSUPPORTED_ROLE__") {
        setFormError(t.auth.unsupportedAccountMsg);
      } else {
        setFormError(message || t.auth.invalidCredentials);
      }
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
      {showWebTopBar ? (
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
          Platform.OS !== "web" && styles.bodyNative,
          Platform.OS === "web" && isMobile && styles.bodyMobileWeb,
        ]}
        bottomOffset={32}
      >
        {showTitle ? (
          <Text
            style={[
              styles.title,
              {
                color: colors.foreground,
                alignSelf: isRTL ? "flex-end" : "flex-start",
                width: "100%",
                textAlign: isRTL ? "right" : "left",
              },
            ]}
          >
            {isWeb ? t.auth.logIn : t.auth.welcomeBack}
          </Text>
        ) : null}
        {showSubtitle ? (
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {t.auth.signInSubtitle}
          </Text>
        ) : null}

        <View
          style={{
            width: "100%",
            gap: 12,
            marginTop: Platform.OS === "web" ? (showSubtitle ? 28 : 20) : showSubtitle ? 14 : 10,
          }}
        >
          {formError ? <AuthFormError message={formError} colors={colors} /> : null}
          <AuthFormField
            label={t.auth.email}
            value={email}
            onChange={(value) => {
              setEmail(value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              if (formError) setFormError(null);
            }}
            error={fieldErrors.email}
            placeholder={t.auth.emailPlaceholder}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
            colors={colors}
            isRTL={isRTL}
          />
          <AuthFormField
            ref={passwordRef}
            label={t.auth.password}
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              if (formError) setFormError(null);
            }}
            error={fieldErrors.password}
            placeholder={t.auth.passwordPlaceholder}
            secure
            returnKeyType="go"
            onSubmitEditing={() => {
              if (!loading) void submit();
            }}
            colors={colors}
            isRTL={isRTL}
          />
          <Pressable
            onPress={() => router.push("/auth/forgot-password")}
            style={{ alignItems: isRTL ? "flex-start" : "flex-end", paddingVertical: 2 }}
          >
            <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>
              {t.auth.forgotPassword}
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Platform.OS === "web"
                ? router.replace("/auth/signup")
                : router.replace({ pathname: "/welcome", params: { panel: "signup" } })
            }
            style={styles.switchLink}
          >
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>
              {t.auth.noAccountSignUp}
            </Text>
          </Pressable>
          <Pressable
            onPress={submit}
            disabled={loading}
            style={({ pressed }) => [
              styles.btn,
              {
                shadowColor: colors.primary,
                opacity: loading ? 0.7 : pressed ? 0.92 : 1,
              },
            ]}
          >
            <LinearGradient
              colors={loading ? ["#94A3B8", "#94A3B8"] : accentGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>{t.auth.logIn}</Text>
              )}
            </LinearGradient>
          </Pressable>
          <GoogleAuthButton />
          {Platform.OS === "web" ? (
            <View style={{ alignItems: "center" }}>
              <AuthHomeLink />
            </View>
          ) : null}
        </View>
      </AuthFormBody>
    </View>
  );

  if (Platform.OS === "web") {
    return screen;
  }

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
  bodyNative: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  bodyMobileWeb: { paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: Platform.OS === "web" ? 28 : 24, fontWeight: "800" },
  sub: { fontSize: 14, marginTop: 4 },
  btn: {
    marginTop: Platform.OS === "web" ? 8 : 4,
    borderRadius: 14,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  btnGradient: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.2 },
  switchLink: {
    paddingVertical: 10,
    alignItems: "center",
  },
});
