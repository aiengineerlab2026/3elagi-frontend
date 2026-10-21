import { useEffect } from "react";
import { GLOBAL_WEB_CSS } from "@/components/web/globalWebStyles";

const STYLE_ID = "3elagi-global-web-styles";

/**
 * Ensures brand scrollbar / global web CSS is present at runtime.
 * Complements `app/+html.tsx` (which may be missing or stale in some web builds).
 */
export function GlobalWebStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = GLOBAL_WEB_CSS;
  }, []);

  return null;
}
