import { describe, expect, it } from "vitest";
import type { Speciality } from "@/domains/home/api";
import {
  buildDoctorsDirectoryHref,
  buildSpecialityDoctorsHref,
  findSpecialityBySlug,
  specialitySlug,
} from "./specialityRoutes";

const cardiology: Speciality = {
  id: "spec-1",
  nameEn: "Cardiology",
  nameAr: "أمراض القلب",
  imageUrl: "",
};

describe("specialityRoutes", () => {
  it("builds slug and deep links", () => {
    expect(specialitySlug(cardiology)).toBe("cardiology");
    expect(buildSpecialityDoctorsHref(cardiology)).toBe("/speciality/cardiology");
    expect(buildDoctorsDirectoryHref(cardiology)).toBe(
      "/doctors?specialty=cardiology",
    );
    expect(buildDoctorsDirectoryHref()).toBe("/doctors");
  });

  it("resolves English, Arabic, and id slugs", () => {
    const list = [cardiology];
    expect(findSpecialityBySlug(list, "cardiology")).toEqual(cardiology);
    expect(findSpecialityBySlug(list, "أمراض-القلب")).toEqual(cardiology);
    expect(findSpecialityBySlug(list, "spec-1")).toEqual(cardiology);
    expect(findSpecialityBySlug(list, "missing")).toBeUndefined();
  });
});
