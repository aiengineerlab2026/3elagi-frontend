import { Cookie } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UI } from "@/constants/uiTokens";
import { loadWebClarity } from "@/domains/privacy/clarityWeb";
import {
  hasCookieConsentAnswer,
  saveCookieConsent,
  type CookieConsentChoice,
} from "@/domains/privacy/cookieConsent";
import { useColors, useResolvedTheme } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";
import { viewportPortal } from "@/utils/viewportPortal";

export function CookieConsentBanner() {
  const colors = useColors();
  const theme = useResolvedTheme();
  const isDark = theme === "dark";
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasCookieConsentAnswer());
  }, []);

  const respond = (choice: CookieConsentChoice) => {
    saveCookieConsent(choice);
    if (choice === "accepted") {
      loadWebClarity();
    }
    setVisible(false);
  };

  if (!visible) return null;

  const panelShadow =
    Platform.OS === "web"
      ? ({
          boxShadow: isDark
            ? "0 -12px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(45, 212, 191, 0.18)"
            : "0 -12px 40px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 118, 110, 0.12)",
        } as object)
      : UI.shadowXl;

  const panelBg = isDark ? "#243044" : "#ffffff";
  const panelBorder = isDark ? `${colors.primary}66` : `${colors.primary}33`;

  const content = (
    <View style={styles.overlay} accessibilityViewIsModal accessibilityLiveRegion="polite">
      <View
        style={[
          styles.backdrop,
          {
            backgroundColor: isDark ? "rgba(0, 0, 0, 0.62)" : "rgba(15, 23, 42, 0.45)",
          },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View
          style={[
            styles.panel,
            panelShadow,
            {
              backgroundColor: panelBg,
              borderColor: panelBorder,
            },
          ]}
        >
        <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
        <View style={[styles.topRow, { flexDirection: dir }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
            <Cookie size={20} color={colors.primary} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
              {t.cookieConsent.title}
            </Text>
            <Text style={[styles.message, { color: colors.mutedForeground, textAlign }]}>
              {t.cookieConsent.message}
            </Text>
            <Text style={[styles.essentialNote, { color: colors.foreground, textAlign }]}>
              {t.cookieConsent.essentialNote}
            </Text>
          </View>
        </View>

        <View style={[styles.actions, { flexDirection: dir }]}>
          <Pressable
            onPress={() => respond("rejected")}
            accessibilityRole="button"
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.actionBtn,
              styles.rejectBtn,
              {
                borderColor: isDark ? colors.border : "#cbd5e1",
                backgroundColor:
                  pressed || hovered
                    ? isDark
                      ? colors.muted
                      : "#f1f5f9"
                    : isDark
                      ? "#1a2132"
                      : "#ffffff",
              },
            ]}
          >
            <Text style={[styles.rejectBtnText, { color: colors.foreground, textAlign }]}>
              {t.cookieConsent.reject}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => respond("accepted")}
            accessibilityRole="button"
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.actionBtn,
              styles.acceptBtn,
              {
                backgroundColor:
                  pressed || hovered ? `${colors.primary}e6` : colors.primary,
                ...(Platform.OS === "web"
                  ? ({
                      boxShadow: `0 4px 14px ${colors.primary}44`,
                    } as object)
                  : null),
              },
            ]}
          >
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground, textAlign }]}>
              {t.cookieConsent.accept}
            </Text>
          </Pressable>
        </View>
        </View>
      </View>
    </View>
  );

  return viewportPortal(content);
}

const styles = StyleSheet.create({
  overlay: {
    ...(Platform.OS === "web"
      ? ({
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10002,
        } as object)
      : {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10002,
          elevation: 10002,
        }),
    justifyContent: "flex-end",
    pointerEvents: "auto",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === "web"
      ? ({
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        } as object)
      : null),
  },
  sheet: {
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 16,
    zIndex: 1,
  },
  panel: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    borderRadius: 18,
    borderWidth: 2,
    padding: 18,
    paddingTop: 14,
    gap: 14,
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  topRow: {
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
  },
  essentialNote: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  actions: {
    gap: 10,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 112,
    flex: 1,
    maxWidth: 200,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer" as "auto",
  },
  rejectBtn: {
    borderWidth: 1.5,
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  acceptBtn: {},
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
