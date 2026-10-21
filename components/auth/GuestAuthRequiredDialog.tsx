import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { LogIn, UserPlus, X } from "lucide-react-native";
import React from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Logo3elagi } from "@/components/Logo3elagi";
import { LOGO_HEIGHT } from "@/constants/brand";
import { useGuestAuthDialogStore } from "@/domains/auth/guestAuthDialogStore";
import { clearPendingAuthReturn } from "@/domains/auth/pendingAuthReturn";
import { useAccentGradient, useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { flexRow } from "@/utils/rtl";

/** Design-system dialog prompting guests to log in or sign up (welcome CTA buttons). */
export function GuestAuthRequiredDialog() {
  const colors = useColors();
  const accentGradient = useAccentGradient();
  const { t, isRTL } = useI18n();
  const visible = useGuestAuthDialogStore((s) => s.visible);
  const close = useGuestAuthDialogStore((s) => s.close);
  const dir = flexRow(isRTL);

  const dismiss = () => {
    clearPendingAuthReturn();
    close();
  };

  const goLogin = () => {
    // Keep pending return so login resumes the chat the guest tried to open.
    close();
    if (Platform.OS === "web") {
      router.push("/auth/login");
    } else {
      router.push({ pathname: "/welcome", params: { panel: "login" } });
    }
  };

  const goSignup = () => {
    close();
    if (Platform.OS === "web") {
      router.push("/auth/signup");
    } else {
      router.push({ pathname: "/welcome", params: { panel: "signup" } });
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={dismiss}>
      <View style={styles.overlay} accessibilityViewIsModal>
        <Pressable
          style={styles.backdrop}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel={t.common.cancel}
        />
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.topBar, { flexDirection: dir }]}>
            <View style={styles.topBarSpacer} />
            <Pressable
              onPress={dismiss}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={t.common.cancel}
              hitSlop={8}
            >
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.brand}>
            <Logo3elagi height={LOGO_HEIGHT.header} />
          </View>

          <Text style={[styles.title, { color: colors.foreground, textAlign: "center" }]}>
            {t.auth.guestAuthRequiredTitle}
          </Text>

          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t.auth.guestAuthRequiredMessage}
          </Text>

          <Pressable
            onPress={goLogin}
            style={({ pressed }) => [
              styles.btnPrimary,
              { opacity: pressed ? 0.92 : 1, shadowColor: colors.primary },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t.auth.logIn}
          >
            <LinearGradient
              colors={accentGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.btnPrimaryGradient, { flexDirection: dir }]}
            >
              <LogIn size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>{t.auth.logIn}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={goSignup}
            style={({ pressed }) => [
              styles.btnGhost,
              {
                borderColor: colors.primary,
                backgroundColor: pressed
                  ? colors.primary + "29"
                  : colors.primary + "14",
                flexDirection: dir,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t.auth.newMemberSignUp}
          >
            <UserPlus size={18} color={colors.primary} />
            <Text style={[styles.btnGhostText, { color: colors.primary }]}>
              {t.auth.newMemberSignUp}
            </Text>
          </Pressable>

          <Pressable
            onPress={dismiss}
            style={({ pressed }) => [styles.btnCancel, { opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={t.common.cancel}
          >
            <Text style={[styles.btnCancelText, { color: colors.mutedForeground }]}>
              {t.common.cancel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    ...(Platform.OS === "web"
      ? ({
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
        } as object)
      : null),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    marginHorizontal: 8,
  },
  topBar: {
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: -4,
    marginBottom: -4,
  },
  topBarSpacer: { flex: 1 },
  brand: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  closeBtn: {
    padding: 4,
    cursor: "pointer" as "auto",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 4,
  },
  btnPrimary: {
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 8,
    cursor: "pointer" as "auto",
  },
  btnPrimaryGradient: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  btnGhost: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    cursor: "pointer" as "auto",
  },
  btnGhostText: {
    fontWeight: "800",
    fontSize: 16,
  },
  btnCancel: {
    paddingVertical: 8,
    alignItems: "center",
    cursor: "pointer" as "auto",
  },
  btnCancelText: {
    fontWeight: "600",
    fontSize: 14,
  },
});
