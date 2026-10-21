import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Logo3elagi } from "@/components/Logo3elagi";
import { AppSidebarMenuButton } from "@/components/nav/AppSidebarDrawer";
import { goHome } from "@/domains/navigation/goHome";
import { LOGO_HEIGHT } from "@/constants/brand";
import { useColors } from "@/hooks/useColors";
import { useMobileWebPageTitlePaddingTop } from "@/hooks/useMobileWebPageTitlePaddingTop";
import { useShowAppHeader } from "@/hooks/useShowAppHeader";
import { useWebLayout } from "@/hooks/useWebLayout";

interface Props {
  children?: React.ReactNode;
  surface?: "background" | "card";
  borderless?: boolean;
  title?: string;
}

export function AppHeader({
  children,
  surface = "background",
  borderless = false,
  title,
}: Props) {
  const colors = useColors();
  const { isMobile, isTablet } = useWebLayout();
  const mobileTitleTop = useMobileWebPageTitlePaddingTop();
  const showHeader = useShowAppHeader();

  if (!showHeader) return null;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: surface === "card" ? colors.card : colors.background,
          borderBottomColor: colors.border,
          borderBottomWidth: borderless ? 0 : StyleSheet.hairlineWidth,
          // Mobile web: sit at the viewport top (safe-area only — no extra gap).
          paddingTop: isTablet ? 16 : mobileTitleTop,
        },
      ]}
    >
      {isMobile ? (
        <View style={styles.brandRow}>
          <AppSidebarMenuButton />
          <Pressable
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel="3elagi"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Logo3elagi height={LOGO_HEIGHT.header} />
          </Pressable>
        </View>
      ) : title ? (
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      ) : null}
      {children ? <View style={styles.below}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  brandRow: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  below: { marginTop: 4 },
});
