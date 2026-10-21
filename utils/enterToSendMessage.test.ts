import { describe, expect, it, vi } from "vitest";

const dimensions = { width: 1280 };
vi.mock("react-native", () => ({
  Platform: { OS: "web" },
  Dimensions: { get: () => dimensions },
}));

const { handleEnterToSendMessage } = await import("./enterToSendMessage");

function keyEvent(key: string, shiftKey = false) {
  const preventDefault = vi.fn();
  return {
    event: { nativeEvent: { key, shiftKey }, preventDefault } as never,
    preventDefault,
  };
}

describe("handleEnterToSendMessage", () => {
  it("sends on Enter at desktop width", () => {
    dimensions.width = 1280;
    const send = vi.fn();
    const { event, preventDefault } = keyEvent("Enter");
    handleEnterToSendMessage(event, send);
    expect(send).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalled();
  });

  it("never sends on a phone-width viewport — Enter is the return key", () => {
    dimensions.width = 390;
    const send = vi.fn();
    handleEnterToSendMessage(keyEvent("Enter").event, send);
    expect(send).not.toHaveBeenCalled();
  });

  it("leaves Shift+Enter and other keys alone", () => {
    dimensions.width = 1280;
    const send = vi.fn();
    handleEnterToSendMessage(keyEvent("Enter", true).event, send);
    handleEnterToSendMessage(keyEvent("a").event, send);
    expect(send).not.toHaveBeenCalled();
  });
});
