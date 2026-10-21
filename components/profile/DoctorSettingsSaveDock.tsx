import { LogOut } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PROFILE_SETTINGS } from "@/constants/profileSettingsDesign";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

type Props = {
  saving: boolean;
  onSave: () => void;
  showLogout?: boolean;
  onLogout?: () => void;
  isRTL: boolean;
  desktop?: boolean;
  maxWidth?: number;
};

const glassFooterStyle: ViewStyle =
  Platform.OS === "web"
    ? ({
        backgroundColor: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      } as ViewStyle)
    : {
        backgroundColor: "rgba(255,255,255,0.95)",
      };

export function DoctorSettingsSaveDock({
  saving,
  onSave,
  showLogout,
  onLogout,
  isRTL,
  desktop,
  maxWidth,
}: Props) {
  const colors = useColors();
  const { t } = useI18n();
  const dir = isRTL ? "row-reverse" : "row";

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[
        styles.footer,
        !desktop ? glassFooterStyle : { backgroundColor: PROFILE_SETTINGS.bg.card },
        { borderTopColor: PROFILE_SETTINGS.border, zIndex: 9000 },
      ]}
    >
      <View
        style={[
          showLogout ? styles.mobileActions : styles.footerInner,
          !showLogout && maxWidth
            ? { maxWidth, flexDirection: dir, gap: 10, alignSelf: "center", width: "100%" }
            : null,
        ]}
      >
        <Pressable
          testID="profile-save"
          onPress={onSave}
          disabled={saving}
          style={[
            styles.saveBtn,
            { backgroundColor: PROFILE_SETTINGS.brand, opacity: saving ? 0.7 : 1 },
            showLogout ? styles.mobileFullBtn : desktop ? styles.desktopSaveBtn : null,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{t.settings.saveChanges}</Text>
          )}
        </Pressable>
        {showLogout && onLogout ? (
          <Pressable
            onPress={onLogout}
            style={[
              styles.logoutBtn,
              styles.mobileFullBtn,
              { borderColor: PROFILE_SETTINGS.border, flexDirection: dir },
            ]}
          >
            <LogOut size={16} color="#ef4444" />
            <Text style={styles.logoutText}>{t.tabs.logout}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  footerInner: {
    paddingHorizontal: 8,
  },
  mobileActions: {
    gap: 10,
  },
  mobileFullBtn: {
    width: "100%",
  },
  saveBtn: {
    minHeight: 46,
    borderRadius: PROFILE_SETTINGS.radius.control,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    flex: 1,
  },
  desktopSaveBtn: {
    flex: 0,
    minWidth: 168,
    alignSelf: "flex-end",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  logoutBtn: {
    minHeight: 46,
    borderRadius: PROFILE_SETTINGS.radius.control,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  logoutText: {
    color: "#ef4444",
    fontWeight: "700",
    fontSize: 15,
  },
});
