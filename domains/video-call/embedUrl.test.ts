import { describe, expect, it } from "vitest";
import { toVideoEmbedUrl } from "./api";

describe("toVideoEmbedUrl", () => {
  it("turns on the in-call chat panel and keeps the display name", () => {
    const url = new URL(toVideoEmbedUrl("https://3elagi.whereby.com/room-1", " Dr Alaa "));
    expect(url.searchParams.get("chat")).toBe("on");
    expect(url.searchParams.get("people")).toBe("on");
    expect(url.searchParams.get("userName")).toBe("Dr Alaa");
  });

  it("keeps params the room already carries", () => {
    const url = new URL(toVideoEmbedUrl("https://3elagi.whereby.com/r?roomKey=abc", "A"));
    expect(url.searchParams.get("roomKey")).toBe("abc");
    expect(url.searchParams.get("chat")).toBe("on");
  });

  it("returns the input untouched when it is not a URL", () => {
    expect(toVideoEmbedUrl("not a url", "A")).toBe("not a url");
  });
});
