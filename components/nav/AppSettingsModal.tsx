import { Languages, Palette, SunMoon, Trash2, X } from "lucide-react-native";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { AccentPicker } from "@/components/AccentPicker";
import { LanguageDropdown } from "@/components/language/LanguageDropdown";
import { ThemeToggle } from "@/components/ThemeToggle";
import { deleteOwnAccount } from "@/domains/auth/account-api";
import { getPostLogoutRoute } from "@/domains/auth/navigation";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AppSettingsModal({ visible, onClose }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const role = useAuthStore((s) => s.role);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDeleteAccount =
    role?.toLowerCase() === "doctor" || role?.toLowerCase() === "patient";

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeletePassword("");
  };

  const confirmDelete = async () => {
    if (!accessToken || !deletePassword.trim()) {
      showErrorToast(t.settings.deleteAccountFailed, t.auth.fieldRequired);
      return;
    }
    setDeleting(true);
    try {
      await deleteOwnAccount(accessToken, deletePassword);
      showSuccessToast(t.settings.deleteAccountSuccess);
      closeDelete();
      onClose();
      logout();
      router.replace(getPostLogoutRoute());
    } catch (e) {
      showErrorToast(t.settings.deleteAccountFailed, (e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.panel,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={[styles.header, { flexDirection: dir, borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
              {t.settings.preferences}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t.common.cancel}
              hitSlop={10}
              style={({ pressed, hovered }) => [
                styles.closeBtn,
                { backgroundColor: pressed || hovered ? colors.muted : "transparent" },
              ]}
            >
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <SettingRow
              icon={<Languages size={18} color={colors.mutedForeground} />}
              label={t.settings.language}
              dir={dir}
              textAlign={textAlign}
              colors={colors}
              isLast={false}
            >
              <LanguageDropdown compact placement="bottom" />
            </SettingRow>

            <SettingRow
              icon={<SunMoon size={18} color={colors.mutedForeground} />}
              label={t.settings.theme}
              dir={dir}
              textAlign={textAlign}
              colors={colors}
              isLast={false}
            >
              <ThemeToggle />
            </SettingRow>

            <SettingRow
              icon={<Palette size={18} color={colors.mutedForeground} />}
              label={t.settings.accentColor}
              dir={dir}
              textAlign={textAlign}
              colors={colors}
              isLast={!canDeleteAccount}
            >
              <AccentPicker />
            </SettingRow>

            {canDeleteAccount ? (
              <View
                style={[
                  styles.dangerZone,
                  { borderTopColor: colors.border },
                ]}
              >
                <View style={[styles.dangerHead, { flexDirection: dir }]}>
                  <Trash2 size={18} color={colors.destructive} />
                  <Text style={[styles.dangerTitle, { color: colors.destructive, textAlign }]}>
                    {t.settings.deleteAccount}
                  </Text>
                </View>
                <Text style={[styles.dangerHint, { color: colors.mutedForeground, textAlign }]}>
                  {t.settings.deleteAccountHint}
                </Text>
                {!deleteOpen ? (
                  <Pressable
                    onPress={() => setDeleteOpen(true)}
                    style={({ pressed }) => [
                      styles.deleteBtn,
                      {
                        borderColor: colors.destructive,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: colors.destructive, fontWeight: "800" }}>
                      {t.settings.deleteAccount}
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.deleteForm}>
                    <Text style={[styles.dangerHint, { color: colors.foreground, textAlign }]}>
                      {t.settings.deleteAccountConfirmBody}
                    </Text>
                    <AppTextInput
                      value={deletePassword}
                      onChangeText={setDeletePassword}
                      placeholder={t.settings.deleteAccountPassword}
                      secureTextEntry
                      editable={!deleting}
                      style={[
                        styles.passwordInput,
                        {
                          backgroundColor: colors.muted,
                          borderColor: colors.border,
                          color: colors.foreground,
                          textAlign,
                        },
                      ]}
                    />
                    <View style={[styles.deleteActions, { flexDirection: dir }]}>
                      <Pressable
                        onPress={closeDelete}
                        disabled={deleting}
                        style={styles.cancelDeleteBtn}
                      >
                        <Text style={{ color: colors.mutedForeground, fontWeight: "700" }}>
                          {t.common.cancel}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void confirmDelete()}
                        disabled={deleting}
                        style={({ pressed }) => [
                          styles.confirmDeleteBtn,
                          {
                            backgroundColor: colors.destructive,
                            opacity: pressed || deleting ? 0.85 : 1,
                          },
                        ]}
                      >
                        {deleting ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={{ color: "#fff", fontWeight: "800" }}>
                            {t.settings.deleteAccountAction}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SettingRow({
  icon,
  label,
  children,
  dir,
  textAlign,
  colors,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  dir: "row" | "row-reverse";
  textAlign: "left" | "right";
  colors: ReturnType<typeof useColors>;
  isLast: boolean;
}) {
  return (
    <View
      style={[
        styles.settingRow,
        { flexDirection: dir, borderBottomColor: colors.border },
        isLast && styles.settingRowLast,
      ]}
    >
      {icon}
      <Text style={[styles.settingLabel, { color: colors.foreground, textAlign, flex: 1 }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  panel: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0 24px 48px rgba(0,0,0,0.18)" } as object,
      default: {},
    }),
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 18, fontWeight: "800", flex: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flexShrink: 0,
  },
  settingRow: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingLabel: { fontSize: 15, fontWeight: "500" },
  dangerZone: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dangerHead: { alignItems: "center", gap: 8 },
  dangerTitle: { fontSize: 15, fontWeight: "800", flex: 1 },
  dangerHint: { fontSize: 13, lineHeight: 18 },
  deleteBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  deleteForm: { gap: 10, marginTop: 4 },
  passwordInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  deleteActions: { gap: 10, alignItems: "center", justifyContent: "flex-end" },
  cancelDeleteBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  confirmDeleteBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minWidth: 140,
    alignItems: "center",
  },
});
