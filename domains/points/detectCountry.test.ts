import { describe, expect, it } from "vitest";

/** Mirrors the parser in detectCountry.ts — pinned against live provider shapes. */
function parseCode(body: string): string | null {
  let value: unknown = body.trim();
  if (String(value).startsWith("{")) {
    try {
      const json = JSON.parse(String(value)) as Record<string, unknown>;
      value = json.country_code ?? json.countryCode ?? json.country;
    } catch {
      return null;
    }
  }
  const code = String(value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null;
}

describe("client geo parsing", () => {
  it("reads every provider shape we call", () => {
    expect(parseCode('{\n    "country_code": "EG"\n}')).toBe("EG"); // ipwho.is
    expect(parseCode('{"ip":"1.2.3.4","country":"EG"}')).toBe("EG"); // api.country.is
    expect(parseCode("EG\n")).toBe("EG"); // ipapi.co
  });

  it("falls through on an error body so the next provider is tried", () => {
    // ipapi.co answers 200 with this once the free tier is exhausted.
    expect(parseCode("{'error': True, 'reason': 'RateLimited'}")).toBeNull();
    expect(parseCode('{"error":true}')).toBeNull();
    expect(parseCode("XX")).toBeNull();
  });
});
