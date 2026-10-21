import { Plus } from "lucide-react-native";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WEB_MAX_WIDTH } from "@/constants/webLayout";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { flexRow } from "@/utils/rtl";

/** Content height above safe-area padding (button + shell padding). */
export const MEDICAL_RECORD_ADD_BAR_HEIGHT = 72;
export const MEDICAL_RECORD_WEB_ADD_BAR_HEIGHT = 80;

export type MedicalRecordAddBarLayout =
  | "dock"
  | "web-inline"
  | "web-dock"
  | "inline"
  | "header"
  /** Same chrome as dock, but not absolutely positioned (for stacking above AI chat). */
  | "stack";

interface Props {
  onAdd: () => void;
  layout?: MedicalRecordAddBarLayout;
  /** Kept for call-site compatibility; category choice happens on the add form. */
  showDiagnosis?: boolean;
  /** When `layout="dock"`, offset from the bottom (e.g. above Ask 3elagi AI). */
  bottomOffset?: number;
}

export function MedicalRecordAddBar({
  onAdd,
  layout = "dock",
  bottomOffset = 0,
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isDesktop } = useWebLayout();
  const insets = useSafeAreaInsets();
  const dir = flexRow(isRTL);
  const isHeader = layout === "header";
  const isInline = layout === "inline";
  const isWebInline = layout === "web-inline";
  const isWebDock = layout === "web-dock";
  const isStack = layout === "stack";
  const flushWebDock = Platform.OS === "web" && layout === "dock";
  const useDesktopBtn = isDesktop || isWebInline || isWebDock;

  if (isHeader) {
    return (
      <Pressable
        onPress={onAdd}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.headerBtn,
          { flexDirection: dir, backgroundColor: colors.primary },
          pressed && { opacity: 0.9 },
          hovered && !pressed ? { transform: [{ translateY: -1 }] } : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t.records.addMedicalRecord}
      >
        <View style={styles.headerPlusCircle}>
          <Plus size={16} color={colors.primary} strokeWidth={2.6} />
        </View>
        <Text style={styles.headerLabel} numberOfLines={1}>
          {t.records.addMedicalRecord}
        </Text>
      </Pressable>
    );
  }

  /** Keep the CTA above system nav / home indicator on edge-to-edge mobile. */
  const safeBottomPad =
    layout === "dock" || isStack ? Math.max(insets.bottom, 0) : 0;
  const shellPaddingBottom = isInline || isWebInline
    ? undefined
    : (isWebDock ? 16 : 10) + safeBottomPad;

  const dockStyle: ViewStyle | undefined =
    layout === "dock"
      ? {
          position: "absolute",
          bottom: bottomOffset,
          left: 0,
          right: 0,
        }
      : isWebDock
        ? {
            width: "100%",
            maxWidth: WEB_MAX_WIDTH.content,
            alignSelf: "center",
          }
        : undefined;

  return (
    <View
      style={[
        styles.shell,
        isInline && styles.shellInline,
        isWebInline && styles.shellWebInline,
        flushWebDock && styles.shellWebDock,
        isWebDock && styles.shellWebDocked,
        isStack && styles.shellStack,
        useDesktopBtn && styles.shellDesktop,
        dockStyle,
        {
          backgroundColor:
            layout === "dock" || isWebDock || isStack ? colors.card : "transparent",
          borderTopColor: colors.border,
          shadowColor: colors.foreground,
          alignItems: useDesktopBtn ? "center" : undefined,
          ...(shellPaddingBottom != null ? { paddingBottom: shellPaddingBottom } : null),
        },
      ]}
    >
      <Pressable
        onPress={onAdd}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.addBtn,
          useDesktopBtn && styles.addBtnDesktop,
          {
            flexDirection: dir,
            backgroundColor: pressed ? colors.primary : colors.primary,
            opacity: pressed ? 0.9 : 1,
            transform: hovered && !pressed ? [{ translateY: -1 }] : undefined,
            shadowColor: colors.primary,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t.records.addMedicalRecord}
      >
        <View style={styles.plusCircle}>
          <Plus size={18} color={colors.primary} strokeWidth={2.6} />
        </View>
        <Text style={styles.addLabel} numberOfLines={1}>
          {t.records.addMedicalRecord}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 10,
    // paddingBottom set inline (includes safe-area on dock/stack)
    zIndex: 100,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  shellInline: {
    borderTopWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 0,
    shadowOpacity: 0,
    elevation: 0,
    marginTop: 12,
    marginBottom: 4,
  },
  shellWebInline: {
    borderTopWidth: 0,
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  shellWebDock: {
    paddingBottom: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  shellWebDocked: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  shellStack: {
    shadowOpacity: 0,
    elevation: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  shellDesktop: {
    width: "100%",
  },
  addBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    cursor: "pointer" as "auto",
  },
  addBtnDesktop: {
    width: 300,
    alignSelf: "center",
  },
  plusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  headerBtn: {
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexShrink: 0,
    cursor: "pointer" as "auto",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerPlusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    maxWidth: 200,
  },
});
