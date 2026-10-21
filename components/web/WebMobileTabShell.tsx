import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebMobileTabBar } from "@/components/web/WebMobileTabBar";
import { mobileWebTabBarHeight } from "@/constants/webLayout";
import { useWebLayout } from "@/hooks/useWebLayout";

interface Props {
  children: React.ReactNode;
}

/** Keeps the mobile web tab bar visible on stack routes outside `(tabs)`. */
export function WebMobileTabShell({ children }: Props) {
  const { isMobile } = useWebLayout();
  const insets = useSafeAreaInsets();
  const bottomGap = Math.max(insets.bottom, 8);
  const tabBarHeight = mobileWebTabBarHeight(insets.bottom);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <BottomTabBarHeightContext.Provider value={tabBarHeight}>
      <View style={styles.root}>
        <View style={styles.content}>{children}</View>
        <WebMobileTabBar height={tabBarHeight} bottomGap={bottomGap} />
      </View>
    </BottomTabBarHeightContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
});
