import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppSidebarNav } from "@/components/nav/AppSidebarNav";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";

export function WebSidebar() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const { isDesktop, isTablet } = useWebLayout();
  const [collapsed, setCollapsed] = useState(true);

  // Desktop: expanded rail. Tablet: icon rail to preserve content width.
  useEffect(() => {
    setCollapsed(!isDesktop);
  }, [isDesktop]);

  // PublicLandingNav is only the narrow-screen fallback.
  if (!isTablet) return null;

  return (
    <View
      style={[
        styles.sidebar,
        { width: collapsed ? 68 : 260 },
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRightWidth: isRTL ? 0 : StyleSheet.hairlineWidth,
          borderLeftWidth: isRTL ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      <AppSidebarNav
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
    flexShrink: 0,
  },
});
