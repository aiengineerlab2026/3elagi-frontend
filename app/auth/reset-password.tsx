import { router, useLocalSearchParams } from "expo-router";
import { AppBackButton } from "@/components/nav/AppBackButton";
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
import { authRepository } from "@/domains/auth/repository";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { showSuccessToast } from "@/utils/toast";

function readParam(value?: string | string[]): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/** Expo Router sometimes misses query params from external email links — read the URL too. */
function readTokenFromWindow(): string {
  if (Platform.OS !== "web" || typeof window === "undefined") return "";
  try {
    const fromSearch = new URLSearchParams(window.location.search).get("token");
    if (fromSearch?.trim()) return decodeURIComponent(fromSearch.trim());
    const hash = window.location.hash;
    const q = hash.indexOf("?");
    if (q >= 0) {
      const fromHash = new URLSearchParams(hash.slice(q)).get("token");
      if (fromHash?.trim()) return decodeURIComponent(fromHash.trim());
    }
  } catch {
    /* ignore */
  }
  return "";
}

export default function ResetPasswordScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isDesktop, isMobile } = useWebLayout();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = useMemo(() => {
    const fromParams = readParam(params.token);
    if (fromParams) {
      try {
        return decodeURIComponent(fromParams);
      } catch {
        return fromParams;
      }
    }
    return readTokenFromWindow();
  }, [params.token]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const hideIntro = Platform.OS === "web" && isDesktop;
  const hideWebTopBar = Platform.OS === "web";

  const submit = async () => {
    if (!token) {
      setFormError(t.auth.resetLinkInvalid);
      return;
    }
    if (password.length < 6) {
      setFormError(t.auth.passwordTooShort);
      return;
    }
    if (password !== confirm) {
      setFormError(t.auth.passwordMismatch);
      return;
    }
    setFormError(null);
    setLoading(true);
    try {
      await authRepository.resetPassword(token, password);
      showSuccessToast(t.auth.passwordResetSuccess);
      // Land on APP_WEB_URL root only — no /auth/login or other relative path.
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.replace(window.location.origin);
        return;
      }
      router.replace("/welcome");
    } catch (e) {
      setFormError((e as Error).message || t.auth.resetLinkInvalid);
    } finally {
      setLoading(false);
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
          <AppBackButton
            color={colors.foreground}
            style={{ padding: 6 }}
            fallback="/auth/login"
          />
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
              {t.auth.resetPasswordTitle}
            </Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              {t.auth.resetPasswordSubtitle}
            </Text>
          </>
        ) : null}

        <View style={{ width: "100%", gap: 12, marginTop: hideIntro ? 0 : 28 }}>
          {formError ? <AuthFormError message={formError} colors={colors} /> : null}
          {!token ? (
            <Text style={{ color: colors.destructive, textAlign: "center" }}>
              {t.auth.resetLinkInvalid}
            </Text>
          ) : (
            <>
              <AuthFormField
                label={t.auth.newPassword}
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  if (formError) setFormError(null);
                }}
                placeholder={t.auth.passwordMinPlaceholder}
                secure
                colors={colors}
                isRTL={isRTL}
              />
              <AuthFormField
                label={t.auth.confirmPassword}
                value={confirm}
                onChange={(value) => {
                  setConfirm(value);
                  if (formError) setFormError(null);
                }}
                placeholder={t.auth.passwordMinPlaceholder}
                secure
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
                  <Text style={styles.btnText}>{t.auth.resetPasswordAction}</Text>
                )}
              </Pressable>
            </>
          )}
          <Pressable
            onPress={() => router.replace("/auth/login")}
            style={{ paddingVertical: 8, alignItems: "center" }}
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
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
