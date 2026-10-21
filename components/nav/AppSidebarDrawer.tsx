import { Menu, X } from "lucide-react-native";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppSidebarNav } from "@/components/nav/AppSidebarNav";
import { useAppSidebar } from "@/contexts/AppSidebarContext";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";

export function AppSidebarDrawer() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const { open, closeSidebar } = useAppSidebar();
  const { isTablet } = useWebLayout();

  // Tablet+ web keeps the permanent sidebar; drawer is for mobile web + native.
  if (Platform.OS === "web" && isTablet) return null;

  return (
    <Modal
      visible={open}
      animationType="fade"
      transparent
      onRequestClose={closeSidebar}
    >
      {/*
        Panel is the first flex child; row-reverse in Arabic places it on the
        right (RTL). Avoid `direction: rtl` here — it double-flips with
        AppSidebarNav's explicit row-reverse.
      */}
      <View
        style={[
          styles.overlay,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.card,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              borderColor: colors.border,
              borderRightWidth: isRTL ? 0 : StyleSheet.hairlineWidth,
              borderLeftWidth: isRTL ? StyleSheet.hairlineWidth : 0,
            },
          ]}
        >
          <View
            style={[
              styles.closeRow,
              { justifyContent: isRTL ? "flex-start" : "flex-end" },
            ]}
          >
            <Pressable
              onPress={closeSidebar}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t.common.cancel}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: pressed ? colors.muted : "transparent" },
              ]}
            >
              <X size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <View style={styles.navHost}>
            {/* Web-only: renders null on native, where the app is already installed. */}
            <AppSidebarNav onNavigate={closeSidebar} />
          </View>
        </View>
        <Pressable
          style={styles.backdrop}
          onPress={closeSidebar}
          accessibilityRole="button"
          accessibilityLabel={t.common.cancel}
        />
      </View>
    </Modal>
  );
}

/** Menu button for AppHeader — opens the side drawer on mobile. */
export function AppSidebarMenuButton() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { openSidebar } = useAppSidebar();
  const { isTablet } = useWebLayout();

  if (Platform.OS === "web" && isTablet) return null;

  return (
    <Pressable
      onPress={openSidebar}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={t.tabs.menu}
      style={({ pressed }) => [
        styles.menuBtn,
        {
          // Mirror hamburger to the start edge: left in LTR, right in RTL.
          ...(isRTL ? { right: 12, left: undefined } : { left: 12, right: undefined }),
          backgroundColor: pressed ? colors.muted : "transparent",
        },
      ]}
    >
      <Menu size={22} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  panel: {
    width: 300,
    maxWidth: "86%",
    height: "100%",
    zIndex: 2,
    overflow: "hidden",
  },
  navHost: {
    flex: 1,
    minHeight: 0,
  },
  closeRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtn: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    zIndex: 2,
  },
});
