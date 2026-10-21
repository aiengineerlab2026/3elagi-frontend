import { Download, Smartphone, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { UI } from "@/constants/uiTokens";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { alignText } from "@/utils/rtl";
import { openAndroidAppDownload } from "@/utils/openAndroidAppDownload";
import { viewportPortal } from "@/utils/viewportPortal";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const MODAL_RADIUS = 20;
const INNER_RADIUS = 16;
const CONTROL_RADIUS = 14;

export function MobileAppDownloadModal({ visible, onClose }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isMobile } = useWebLayout();
  const textAlign = alignText(isRTL);
  const [downloadStarted, setDownloadStarted] = useState(false);

  useEffect(() => {
    if (!visible) setDownloadStarted(false);
  }, [visible]);

  if (!visible) return null;

  const startDownload = () => {
    setDownloadStarted(true);
    openAndroidAppDownload();
  };

  const modalShadow =
    Platform.OS === "web"
      ? ({
          boxShadow: `0 28px 70px rgba(15, 23, 42, 0.24), 0 10px 28px rgba(15, 23, 42, 0.12), 0 0 0 1px ${colors.border}`,
        } as object)
      : UI.shadowXl;

  const downloadBtnShadow =
    Platform.OS === "web"
      ? ({
          boxShadow: `0 10px 24px ${colors.primary}55, 0 2px 8px rgba(15, 23, 42, 0.12)`,
          transition: "transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
        } as object)
      : {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.28,
          shadowRadius: 14,
          elevation: 6,
        };

  const content = (
    <View style={styles.overlay} accessibilityViewIsModal>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t.mobileApp.close}
      />
      <ScrollView
        style={[
          styles.dialogScroll,
          isMobile && styles.dialogScrollMobile,
          modalShadow,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        contentContainerStyle={styles.dialogScrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={isMobile}
      >
        <View style={[styles.dialog, isMobile && styles.dialogMobile]}>
          <View
            style={[
              styles.heroStrip,
              { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}22` },
            ]}
          >
            <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
              <Smartphone size={22} color={colors.primaryForeground} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={[styles.heroEyebrow, { color: colors.primary, textAlign }]}>
                Android
              </Text>
              <Text style={[styles.heroTitle, { color: colors.foreground, textAlign }]}>
                {t.mobileApp.modalTitle}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.closeBtn,
                {
                  backgroundColor:
                    pressed || hovered ? colors.muted : `${colors.muted}cc`,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t.mobileApp.close}
            >
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}>
            {t.mobileApp.modalSubtitle}
          </Text>

          <Pressable
            onPress={startDownload}
            accessibilityRole="link"
            accessibilityLabel={t.mobileApp.downloadButton}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.downloadBtn,
              downloadBtnShadow,
              {
                backgroundColor:
                  pressed || hovered ? `${colors.primary}e6` : colors.primary,
                transform:
                  Platform.OS === "web" && hovered && !pressed
                    ? [{ translateY: -1 }]
                    : pressed
                      ? [{ scale: 0.99 }]
                      : undefined,
              },
            ]}
          >
            <Download size={18} color={colors.primaryForeground} />
            <Text style={[styles.downloadBtnText, { color: colors.primaryForeground, textAlign }]}>
              {t.mobileApp.downloadButton}
            </Text>
          </Pressable>

          <View
            style={[
              styles.installBlock,
              {
                borderColor: `${colors.primary}28`,
                backgroundColor: `${colors.primary}08`,
              },
              Platform.OS === "web"
                ? ({
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
                  } as object)
                : null,
            ]}
          >
            <Text style={[styles.installTitle, { color: colors.foreground, textAlign }]}>
              {downloadStarted ? t.mobileApp.playStoreInviteTitle : t.mobileApp.playStoreInvitePreviewTitle}
            </Text>
            <Text style={[styles.installHint, { color: colors.mutedForeground, textAlign }]}>
              {t.mobileApp.playStoreInviteHint}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return viewportPortal(content);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(15, 23, 42, 0.58)",
    ...(Platform.OS === "web"
      ? ({
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        } as object)
      : null),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogScroll: {
    width: "100%",
    maxWidth: 420,
    flexGrow: 0,
    borderRadius: MODAL_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  dialogScrollMobile: {
    maxHeight: "92%",
    width: "100%",
    maxWidth: 380,
  },
  dialogScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 8,
  },
  dialog: {
    width: "100%",
    padding: 20,
    gap: 18,
  },
  dialogMobile: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  heroStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: INNER_RADIUS,
    borderWidth: 1,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer" as "auto",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 2,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    alignSelf: "stretch",
    borderRadius: CONTROL_RADIUS,
    paddingVertical: 15,
    paddingHorizontal: 18,
    cursor: "pointer" as "auto",
    overflow: "hidden",
  },
  downloadBtnText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  installBlock: {
    borderRadius: INNER_RADIUS,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    overflow: "hidden",
  },
  installTitle: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },
  installHint: {
    fontSize: 13,
    lineHeight: 19,
  },
});
