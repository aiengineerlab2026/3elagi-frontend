import { Platform } from "react-native";

/** Web-only dual-session demo shell at `/demo`. */
export const DEMO_ENABLED =
  process.env.EXPO_PUBLIC_DEMO_ENABLED === "true" ||
  (process.env.EXPO_PUBLIC_DEMO_ENABLED !== "false" && Platform.OS === "web");

export const DEMO_SLOTS = ["mobile", "laptop"] as const;
export type DemoSlot = (typeof DEMO_SLOTS)[number];

export const DEMO_SLOT_LABELS: Record<
  DemoSlot,
  { en: string; ar: string }
> = {
  mobile: {
    en: "Mobile",
    ar: "جوال",
  },
  laptop: {
    en: "Desktop",
    ar: "سطح المكتب",
  },
};

export function isDemoSlot(value: string): value is DemoSlot {
  return (DEMO_SLOTS as readonly string[]).includes(value);
}
