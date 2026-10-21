import type { BodyZone } from "@/domains/medical/bodyParts";

/** Accent colors matched to the colored glows on `body-anatomy.png`. */
export const ZONE_ACCENT: Record<BodyZone, string> = {
  head_neck: "#7B8FBC",
  chest: "#3D9B5E",
  abdomen: "#14B8A6",
  pelvis: "#9B5BB8",
  right_arm: "#D4A84A",
  left_arm: "#E0892E",
  right_leg: "#5BAFC4",
  left_leg: "#A85A56",
};
