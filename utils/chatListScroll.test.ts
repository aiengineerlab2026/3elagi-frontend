import { describe, expect, it, vi } from "vitest";
import { isChatStuckToLatest, scrollChatToLatest } from "./chatListScroll";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));

const event = (offsetY: number, contentHeight = 1000, viewport = 500) =>
  ({
    nativeEvent: {
      contentOffset: { y: offsetY },
      contentSize: { height: contentHeight },
      layoutMeasurement: { height: viewport },
    },
  }) as never;

/** A FlatList stand-in exposing the web scroll node the helper writes to. */
function fakeList(scrollTop: number) {
  const node = { scrollTop, scrollHeight: 1000 };
  return {
    ref: { current: { getScrollableNode: () => node } as never },
    node,
  };
}

const flush = () => new Promise((r) => setTimeout(r, 250));

describe("isChatStuckToLatest", () => {
  it("treats offset ~0 as the latest edge when inverted", () => {
    expect(isChatStuckToLatest(event(0), true)).toBe(true);
    expect(isChatStuckToLatest(event(400), true)).toBe(false);
  });

  it("measures from the end when not inverted", () => {
    expect(isChatStuckToLatest(event(500), false)).toBe(true);
    expect(isChatStuckToLatest(event(100), false)).toBe(false);
  });
});

describe("scrollChatToLatest", () => {
  it("leaves a list already parked at the newest edge alone", async () => {
    const { ref, node } = fakeList(0);
    const writes: number[] = [];
    Object.defineProperty(node, "scrollTop", {
      get: () => 0,
      set: (v: number) => writes.push(v),
    });

    scrollChatToLatest(ref, true);
    await flush();

    // This is the flicker: re-writing the offset made the thread jump.
    expect(writes).toEqual([]);
  });

  it("pulls a scrolled-away inverted list back to the top", async () => {
    const { ref, node } = fakeList(320);
    scrollChatToLatest(ref, true);
    await flush();
    expect(node.scrollTop).toBe(0);
  });

  it("stops when the user has scrolled off the latest edge", async () => {
    const { ref, node } = fakeList(320);
    scrollChatToLatest(ref, true, false, { shouldContinue: () => false });
    await flush();
    expect(node.scrollTop).toBe(320);
  });
});
