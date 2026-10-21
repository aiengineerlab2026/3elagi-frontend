import { useWindowDimensions } from "react-native";
import { readDemoWebLayoutOverride } from "@/domains/auth/demoSession";
import { WEB_BREAKPOINTS } from "@/constants/webLayout";

export function useWebLayout() {
  const { width, height } = useWindowDimensions();
  const demoLayout = readDemoWebLayoutOverride();
  const frameWidth =
    typeof window !== "undefined" ? window.innerWidth : width;
  const frameHeight =
    typeof window !== "undefined" ? window.innerHeight : height;

  if (demoLayout === "mobile") {
    const mobileWidth = Math.min(frameWidth, WEB_BREAKPOINTS.tablet - 1);
    return {
      width: mobileWidth,
      height: frameHeight,
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isWide: false,
      gridColumns: 2,
    };
  }

  if (demoLayout === "desktop") {
    const desktopWidth = Math.max(frameWidth, WEB_BREAKPOINTS.desktop);
    return {
      width: desktopWidth,
      height: frameHeight,
      isMobile: false,
      isTablet: true,
      isDesktop: true,
      isWide: desktopWidth >= WEB_BREAKPOINTS.wide,
      gridColumns: desktopWidth >= WEB_BREAKPOINTS.wide ? 4 : 3,
    };
  }

  const isTablet = width >= WEB_BREAKPOINTS.tablet;
  const isDesktop = width >= WEB_BREAKPOINTS.desktop;
  const isWide = width >= WEB_BREAKPOINTS.wide;
  const isMobile = width < WEB_BREAKPOINTS.tablet;

  const gridColumns = isWide ? 4 : isDesktop ? 3 : isTablet ? 3 : 2;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    gridColumns,
  };
}
