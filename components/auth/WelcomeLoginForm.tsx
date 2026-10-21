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
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import type { GoogleNoAccountPayload } from "@/domains/auth/googleAuthFlow";

interface Props {
  onSwitchToSignup: () => void;
  onGoogleNoAccount?: (payload: GoogleNoAccountPayload) => void;
}

export function WelcomeLoginForm({ onSwitchToSignup, onGoogleNoAccount }: Props) {
  const colors = useColors();
  const accentGradient = useAccentGradient();
  const { t, isRTL } = useI18n();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

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

  return (
    <View style={styles.form}>
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
      <Pressable onPress={onSwitchToSignup} style={styles.switchLink}>
        <Text style={[styles.switchLinkText, { color: colors.primary }]}>
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
      <GoogleAuthButton onAccountNotFound={onGoogleNoAccount} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { width: "100%", gap: 12 },
  btn: {
    marginTop: 8,
    borderRadius: 14,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
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
  switchLinkText: {
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
  },
});
