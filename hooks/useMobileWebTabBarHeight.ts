import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { useContext } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mobileWebTabBarHeight } from "@/constants/webLayout";

/** Tab bar height on mobile web — from tab navigator context or safe fallback. */
export function useMobileWebTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  const fromContext = useContext(BottomTabBarHeightContext);
  return fromContext ?? mobileWebTabBarHeight(insets.bottom);
}
