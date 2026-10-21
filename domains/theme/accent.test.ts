import { describe, expect, it } from "vitest";
import colors, { ACCENTS, ACCENT_KEYS } from "@/constants/colors";

describe("accent palettes", () => {
  it("blue is first, and every key covers both themes", () => {
    expect(ACCENT_KEYS[0]).toBe("blue");
    for (const key of ACCENT_KEYS) {
      for (const theme of ["light", "dark"] as const) {
        // A missing token would silently fall back to the blue base palette.
        expect(Object.keys(ACCENTS[key][theme]).sort()).toEqual(
          ["accent", "accentForeground", "primary", "tint"],
        );
      }
    }
  });

  it("overriding a base palette only replaces the accent tokens", () => {
    const merged = { ...colors.light, ...ACCENTS.red.light };
    expect(merged.primary).toBe("#be123c");
    expect(merged.background).toBe(colors.light.background);
    expect(merged.destructive).toBe(colors.light.destructive);
  });
});
