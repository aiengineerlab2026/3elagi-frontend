import { describe, expect, it, vi } from "vitest";
import { isPublicWebPath } from "./navigation";
import { GUEST_ALLOWED_TABS, isGuestAllowedRoot, isSignedInPublicRoot } from "./guestBrowse";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("expo-router", () => ({ router: {} }));
// The guest-tab list pulls in a zustand store that reaches react-native, which
// vitest cannot parse (Flow types).
vi.mock("@/domains/auth/guestAuthDialogStore", () => ({
  useGuestAuthDialogStore: { getState: () => ({ open: () => undefined }) },
}));

describe("isPublicWebPath", () => {
  it("lets guests onto every tab the segment allowlist permits", () => {
    // The two lists are separate guards for the same rule; when they disagree
    // the nav link silently bounces the guest back to welcome.
    for (const tab of GUEST_ALLOWED_TABS) {
      if (tab === "index") continue;
      expect(isPublicWebPath(`/${tab}`), tab).toBe(true);
      expect(isPublicWebPath(`/(tabs)/${tab}`), tab).toBe(true);
    }
  });

  it("still keeps guests out of signed-in tabs", () => {
    expect(isPublicWebPath("/records")).toBe(false);
    expect(isPublicWebPath("/(tabs)/points")).toBe(false);
    expect(isPublicWebPath("/(tabs)/appointments")).toBe(false);
  });

  it("allows home, welcome and the auth flows", () => {
    expect(isPublicWebPath("/")).toBe(true);
    expect(isPublicWebPath("/(tabs)")).toBe(true);
    expect(isPublicWebPath("/auth/login")).toBe(true);
  });

  it("keeps the doctor directory public in both guards", () => {
    // Hero CTAs and the patient role card all land here while signed out; if
    // either guard misses it the push is immediately bounced to welcome.
    expect(isPublicWebPath("/doctors")).toBe(true);
    expect(isGuestAllowedRoot("doctors")).toBe(true);
    expect(isGuestAllowedRoot("points")).toBe(false);
  });

  it("keeps per-speciality doctor rosters public for guests", () => {
    expect(isPublicWebPath("/speciality/cardiology")).toBe(true);
    expect(isPublicWebPath("/specialties/cardiology")).toBe(true);
    expect(isGuestAllowedRoot("speciality")).toBe(true);
    expect(isGuestAllowedRoot("specialties")).toBe(true);
  });

  it("keeps documentation public for guests", () => {
    expect(isPublicWebPath("/documentation")).toBe(true);
    expect(isPublicWebPath("/(tabs)/documentation")).toBe(true);
    expect(isGuestAllowedRoot("(tabs)", "documentation")).toBe(true);
  });

  it("keeps marketing routes reachable while signed in", () => {
    for (const root of ["contact", "register-with-us", "rate-us", "demo"] as const) {
      expect(isSignedInPublicRoot(root), root).toBe(true);
      expect(isPublicWebPath(`/${root}`), root).toBe(true);
      expect(isGuestAllowedRoot(root), root).toBe(true);
    }
  });
});
