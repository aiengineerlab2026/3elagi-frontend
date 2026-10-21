import { Href, usePathname, useRouter } from "expo-router";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import React, { useCallback } from "react";
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useI18n } from "@/hooks/useI18n";
import { canNavigateBack, navigateBack } from "@/utils/appNavigation";

type Props = {
  color: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
  /**
   * If set, the button stays visible even with an empty stack and replaces
   * to this route. Omit to hide the button on the first stack entry.
   */
  fallback?: Href;
  /** Override default stack pop (e.g. end a call, then navigate). */
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * Stack-aware back control for native, web, and mobile web.
 * Hidden when there is no previous push state (unless `fallback` is provided).
 */
export function AppBackButton({
  color,
  size = 22,
  style,
  hitSlop = 12,
  fallback,
  onPress,
  accessibilityLabel = "Back",
  testID,
}: Props) {
  const router = useRouter();
  // Re-render when the route changes so visibility tracks the stack.
  usePathname();
  const { isRTL } = useI18n();
  const canGo = canNavigateBack(router);

  if (!canGo && fallback == null) return null;

  const Icon = isRTL ? ArrowRight : ArrowLeft;

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
      return;
    }
    navigateBack(router, fallback);
  }, [fallback, onPress, router]);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      style={[styles.hitTarget, style]}
      hitSlop={hitSlop}
    >
      <Icon size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitTarget: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
