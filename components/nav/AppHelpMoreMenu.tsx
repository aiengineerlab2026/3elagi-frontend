import { useRouter } from "expo-router";
import { CircleHelp, Star, X } from "lucide-react-native";
import React from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AndroidIcon } from "@/components/icons/AndroidIcon";
import { useMobileAppDownloadStore } from "@/domains/mobileApp/downloadStore";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigate?: () => void;
}

export function AppHelpMoreMenu({ visible, onClose, onNavigate }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const openDownload = useMobileAppDownloadStore((s) => s.openDownload);
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);

  const openRateUs = () => {
    onClose();
    onNavigate?.();
    router.navigate("/rate-us");
  };

  const openAndroidApp = () => {
    onClose();
    onNavigate?.();
    openDownload();
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
            <View style={[styles.headerTitleRow, { flexDirection: dir }]}>
              <CircleHelp size={18} color={colors.mutedForeground} />
              <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
                {t.tabs.helpAndMore}
              </Text>
            </View>
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
            <Pressable
              onPress={openRateUs}
              accessibilityRole="button"
              accessibilityLabel={t.tabs.rateUs}
              style={({ pressed, hovered }) => [
                styles.menuRow,
                {
                  flexDirection: dir,
                  borderBottomColor: colors.border,
                  backgroundColor: pressed || hovered ? colors.muted : "transparent",
                },
              ]}
            >
              <Star size={18} color={colors.mutedForeground} />
              <Text style={[styles.menuLabel, { color: colors.foreground, textAlign }]}>
                {t.tabs.rateUs}
              </Text>
            </Pressable>

            {Platform.OS === "web" ? (
              <Pressable
                onPress={openAndroidApp}
                accessibilityRole="button"
                accessibilityLabel={t.mobileApp.linkLabel}
                style={({ pressed, hovered }) => [
                  styles.menuRow,
                  styles.menuRowLast,
                  {
                    flexDirection: dir,
                    backgroundColor: pressed || hovered ? colors.muted : "transparent",
                  },
                ]}
              >
                <AndroidIcon size={18} color={colors.mutedForeground} />
                <Text style={[styles.menuLabel, { color: colors.foreground, textAlign }]}>
                  {t.mobileApp.linkLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
    maxWidth: 360,
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleRow: {
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  title: { fontSize: 17, fontWeight: "800" },
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
  menuRow: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
});
