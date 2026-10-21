import { CLARITY_WEB_PROJECT_ID } from "@/constants/clarity";

let clarityLoaded = false;

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[] };

/** Load Microsoft Clarity on web only after the user accepts cookies. */
export function loadWebClarity(): void {
  if (typeof window === "undefined" || clarityLoaded) return;
  clarityLoaded = true;

  const w = window as Window & { clarity?: ClarityFn };
  if (!w.clarity) {
    const fn = function (...args: unknown[]) {
      (fn.q = fn.q || []).push(args);
    } as ClarityFn;
    fn.q = [];
    w.clarity = fn;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${CLARITY_WEB_PROJECT_ID}`;
  document.head.appendChild(script);
}
