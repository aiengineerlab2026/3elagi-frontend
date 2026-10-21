import { usePathname } from "expo-router";
import { useEffect } from "react";
import { readDemoWebLayoutOverride } from "@/domains/auth/demoSession";

const MOBILE_CLASS = "demo-embed-mobile";
const DESKTOP_CLASS = "demo-embed-desktop";

const DEMO_EMBED_CSS = `
html.demo-embed-mobile,
html.demo-embed-mobile body,
html.demo-embed-mobile #root {
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
}

html.demo-embed-mobile [data-testid="root"],
html.demo-embed-mobile #root > div {
  max-width: 100% !important;
}
`;

const STYLE_ID = "3elagi-demo-embed-viewport";

/** Locks demo iframe panels to their device layout width (mobile web vs desktop web). */
export function DemoEmbedViewport() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const mode = readDemoWebLayoutOverride();

    root.classList.remove(MOBILE_CLASS, DESKTOP_CLASS);
    if (mode === "mobile") root.classList.add(MOBILE_CLASS);
    if (mode === "desktop") root.classList.add(DESKTOP_CLASS);

    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (mode === "mobile") {
      if (!style) {
        style = document.createElement("style");
        style.id = STYLE_ID;
        document.head.appendChild(style);
      }
      style.textContent = DEMO_EMBED_CSS;
    } else if (style) {
      style.remove();
    }

    return () => {
      root.classList.remove(MOBILE_CLASS, DESKTOP_CLASS);
      document.getElementById(STYLE_ID)?.remove();
    };
  }, [pathname]);

  return null;
}
