import { router } from "expo-router";
import { KeyRound } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { authRepository } from "@/domains/auth/repository";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

type Props = {
  accessToken: string;
};

export function ProfileChangePasswordField({ accessToken }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!currentPassword.trim()) {
      setError(t.settings.currentPasswordRequired);
      return;
    }
    if (newPassword.length < 6) {
      setError(t.auth.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.auth.passwordMismatch);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authRepository.changePassword(accessToken, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSuccessToast(t.settings.changePasswordSuccess);
    } catch (e) {
      const message = (e as Error).message || t.settings.changePasswordFailed;
      setError(message);
      showErrorToast(t.settings.changePasswordFailed, message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { flexDirection: dir }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
          <KeyRound size={18} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
            {t.settings.changePassword}
          </Text>
          <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
            {t.settings.changePasswordHint}
          </Text>
        </View>
      </View>

      <View style={styles.fields}>
        <PasswordField
          label={t.settings.currentPassword}
          value={currentPassword}
          onChangeText={(value) => {
            setCurrentPassword(value);
            if (error) setError(null);
          }}
          placeholder={t.auth.passwordPlaceholder}
          colors={colors}
          textAlign={textAlign}
        />
        <PasswordField
          label={t.auth.newPassword}
          value={newPassword}
          onChangeText={(value) => {
            setNewPassword(value);
            if (error) setError(null);
          }}
          placeholder={t.auth.passwordMinPlaceholder}
          colors={colors}
          textAlign={textAlign}
        />
        <PasswordField
          label={t.auth.confirmPassword}
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            if (error) setError(null);
          }}
          placeholder={t.auth.passwordMinPlaceholder}
          colors={colors}
          textAlign={textAlign}
          onSubmitEditing={() => {
            if (!loading) void submit();
          }}
        />
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.destructive, textAlign }]}>{error}</Text>
      ) : null}

      <Pressable
        onPress={() => void submit()}
        disabled={loading}
        style={[
          styles.btn,
          {
            backgroundColor: loading ? colors.muted : colors.primary,
            opacity: loading ? 0.85 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t.settings.changePasswordAction}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{t.settings.changePasswordAction}</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => router.push("/auth/forgot-password")}
        style={{ alignSelf: isRTL ? "flex-end" : "flex-start" }}
        accessibilityRole="button"
      >
        <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13, textAlign }}>
          {t.auth.forgotPassword}
        </Text>
      </Pressable>
    </View>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  textAlign,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
  textAlign: "left" | "right" | "center";
  onSubmitEditing?: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground, textAlign }]}>
        {label}
      </Text>
      <AppTextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        autoCapitalize="none"
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        onSubmitEditing={onSubmitEditing}
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.foreground,
            textAlign,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  header: { alignItems: "flex-start", gap: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: "800" },
  hint: { fontSize: 13, lineHeight: 18 },
  fields: { gap: 12 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  error: { fontSize: 13, fontWeight: "600" },
  btn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
