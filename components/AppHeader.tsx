import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo3elagi } from "@/components/Logo3elagi";
import { AppSidebarMenuButton } from "@/components/nav/AppSidebarDrawer";
import { goHome } from "@/domains/navigation/goHome";
import { LOGO_HEIGHT } from "@/constants/brand";
import { useColors } from "@/hooks/useColors";
import { useHubEmbedded } from "@/hooks/useHubEmbedded";
import { useShowAppHeader } from "@/hooks/useShowAppHeader";

interface Props {
  /** Optional content rendered below the brand row (e.g. a search bar). */
  children?: React.ReactNode;
  /** When true, header background uses `card` instead of `background`. */
  surface?: "background" | "card";
  borderless?: boolean;
  title?: string;
}

export function AppHeader({ children, surface = "background" }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const embedded = useHubEmbedded();
  const showHeader = useShowAppHeader();

  if (!showHeader) return null;

  // Inside the Patients hub the hub owns the brand header, so drop the logo
  // here (and skip entirely when there's nothing else to show).
  if (embedded && !children) return null;

  return (
    <View
      style={[
        styles.root,
        {
          // Native: content starts at the status-bar edge (minimal breathing room).
          paddingTop: embedded ? 8 : insets.top + 4,
          backgroundColor: surface === "card" ? colors.card : colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {embedded ? null : (
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
      )}
      {children ? (
        <View style={embedded ? undefined : styles.below}>{children}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  brandRow: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  below: { marginTop: 4 },
});
