import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mobileWebPageTitlePaddingTop } from "@/constants/webLayout";
import { useWebLayout } from "@/hooks/useWebLayout";

/** Extra top padding for tab page titles on mobile web (mobile viewport). */
export function useMobileWebPageTitlePaddingTop(): number {
  const { isMobile } = useWebLayout();
  const insets = useSafeAreaInsets();

  if (Platform.OS !== "web" || !isMobile) return 0;
  return mobileWebPageTitlePaddingTop(insets.top);
}
