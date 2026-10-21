import { describe, expect, it } from "vitest";
import { matchesSlug, toSlug } from "./slug";

describe("toSlug", () => {
  it("makes a URL-safe name", () => {
    expect(toSlug("Dr. Sarah Hany")).toBe("dr-sarah-hany");
    expect(toSlug("  Ear, Nose & Throat  ")).toBe("ear-nose-throat");
    expect(toSlug("Pédiatrie")).toBe("pediatrie");
  });

  it("keeps Arabic readable instead of dropping it", () => {
    // Hamza is a combining mark after NFD, so أ normalises to ا — both sides
    // of a comparison go through this, so the slug still round-trips.
    expect(toSlug("أمراض القلب")).toBe("امراض-القلب");
    expect(matchesSlug(toSlug("أمراض القلب"), "أمراض القلب")).toBe(true);
  });

  it("survives empty input", () => {
    expect(toSlug(null)).toBe("");
    expect(toSlug("---")).toBe("");
  });
});

describe("matchesSlug", () => {
  it("matches any of the candidate names", () => {
    expect(matchesSlug("cardiology", "Cardiology", "أمراض القلب")).toBe(true);
    expect(matchesSlug("أمراض-القلب", "Cardiology", "أمراض القلب")).toBe(true);
    expect(matchesSlug("dermatology", "Cardiology")).toBe(false);
  });

  it("ignores the doctor title on either side", () => {
    expect(matchesSlug("dr-sarah-hany", "Sarah Hany")).toBe(true);
    expect(matchesSlug("sarah-hany", "Dr. Sarah Hany")).toBe(true);
  });

  it("never matches on an empty slug", () => {
    expect(matchesSlug("", "Cardiology")).toBe(false);
    expect(matchesSlug(null, "Cardiology")).toBe(false);
  });
});
