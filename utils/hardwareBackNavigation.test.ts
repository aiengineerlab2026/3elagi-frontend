import { describe, expect, it, vi } from "vitest";
import { getHardwareBackAction } from "./hardwareBackNavigation";

// appNavigation imports expo-router at runtime, which vitest cannot parse.
vi.mock("expo-router", () => ({
  router: { back: vi.fn(), replace: vi.fn(), canGoBack: () => false },
}));
const leaveChatToHistory = vi.fn();
vi.mock("@/utils/chatNavigation", () => ({
  leaveChatToHistory: (origin?: string | null) => leaveChatToHistory(origin),
}));
vi.mock("@/utils/medicalFormNavigation", () => ({ leaveMedicalForm: vi.fn() }));

function router(canGoBack: boolean) {
  return {
    back: vi.fn(),
    replace: vi.fn(),
    canGoBack: () => canGoBack,
  };
}

describe("getHardwareBackAction", () => {
  it("pops real history rather than jumping to a fixed route", () => {
    // /doctor/* used to always redirect home, discarding where you came from.
    const r = router(true);
    getHardwareBackAction("/doctor/abc", r)?.();
    expect(r.back).toHaveBeenCalledOnce();
    expect(r.replace).not.toHaveBeenCalled();
  });

  it("falls back to a sensible route when there is no history", () => {
    // e.g. opened straight from a push notification.
    const r = router(false);
    getHardwareBackAction("/doctor/abc", r)?.();
    expect(r.replace).toHaveBeenCalledWith("/(tabs)");
  });

  it("passes the chat's origin through when there is no history", () => {
    getHardwareBackAction("/chat/abc?from=doctors", router(false))?.();
    expect(leaveChatToHistory).toHaveBeenCalledWith("doctors");

    getHardwareBackAction("/chat/abc", router(false))?.();
    expect(leaveChatToHistory).toHaveBeenCalledWith(null);
  });

  it("hands back to the OS (closes the app) with empty history and no fallback", () => {
    expect(getHardwareBackAction("/(tabs)", router(false))).toBeNull();
    expect(getHardwareBackAction("/", router(false))).toBeNull();
    expect(getHardwareBackAction("/some/deep/screen", router(false))).toBeNull();
  });
});
