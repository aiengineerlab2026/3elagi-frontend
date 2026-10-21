import { useNavigationContainerRef } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  InteractionManager,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { Logo3elagi } from "@/components/Logo3elagi";
import { useColors } from "@/hooks/useColors";

// How long a navigation must take before we bother showing the loader. Fast
// tab switches / pops settle before this and never flash a spinner.
const SHOW_DELAY_MS = 120;
// Once shown, keep it up at least this long so it can't flicker in/out.
const MIN_VISIBLE_MS = 300;

/**
 * Native-only: shows a full-screen loader during the gap between a navigation
 * (tab switch, push, or back) and the destination screen's content rendering,
 * so screens never flash blank/janky while mounting. Hidden again once
 * interactions (the transition animation + heavy first render) settle.
 */
export function NavLoadingOverlay() {
  const navRef = useNavigationContainerRef();
  const colors = useColors();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const currentKey = (): string | undefined =>
      (navRef.getCurrentRoute() as { key?: string } | undefined)?.key;

    let lastKey = navRef.isReady() ? currentKey() : undefined;
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let interaction: ReturnType<typeof InteractionManager.runAfterInteractions> | null =
      null;
    let shownAt = 0;

    const clearTimers = () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
      interaction?.cancel?.();
      showTimer = null;
      hideTimer = null;
      interaction = null;
    };

    const hide = () => {
      const elapsed = Date.now() - shownAt;
      if (shownAt && elapsed < MIN_VISIBLE_MS) {
        hideTimer = setTimeout(() => setVisible(false), MIN_VISIBLE_MS - elapsed);
      } else {
        setVisible(false);
      }
    };

    const unsubscribe = navRef.addListener("state", () => {
      const key = currentKey();
      if (key === lastKey) return; // not an actual screen change
      lastKey = key;

      clearTimers();
      showTimer = setTimeout(() => {
        shownAt = Date.now();
        setVisible(true);
      }, SHOW_DELAY_MS);

      // Settles after the transition animation + the new screen's first render.
      interaction = InteractionManager.runAfterInteractions(() => {
        if (showTimer) {
          clearTimeout(showTimer);
          showTimer = null;
        }
        hide();
      });
    });

    return () => {
      unsubscribe();
      clearTimers();
    };
  }, [navRef]);

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]} pointerEvents="auto">
      <Logo3elagi height={56} markOnly centered />
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  spinner: {
    marginTop: 20,
  },
});
