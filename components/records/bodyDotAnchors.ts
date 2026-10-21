import { ANATOMY_VIEWBOX } from "@/components/records/bodyPartShapes";
import type { BodyPart, BodyZone } from "@/domains/medical/bodyParts";

export type DotAnchor = { x: number; y: number };

/**
 * Record-indicator anchors in `ANATOMY_VIEWBOX` space, calibrated to
 * organ / limb centers on `body-anatomy.png`.
 */
export const PART_DOT_ANCHORS: Record<Exclude<BodyPart, "general">, DotAnchor> = {
  head: { x: 190, y: 55 },
  neck: { x: 190, y: 100 },
  eyes: { x: 190, y: 48 },
  ears: { x: 190, y: 62 },
  throat: { x: 190, y: 95 },
  thyroid: { x: 190, y: 108 },
  chest: { x: 190, y: 200 },
  thoracic_spine: { x: 190, y: 220 },
  back: { x: 190, y: 210 },
  heart: { x: 177, y: 222 },
  lungs: { x: 190, y: 215 },
  abdomen: { x: 190, y: 355 },
  stomach: { x: 231, y: 343 },
  liver: { x: 147, y: 337 },
  gallbladder: { x: 145, y: 355 },
  pancreas: { x: 190, y: 360 },
  spleen: { x: 235, y: 345 },
  intestines: { x: 184, y: 377 },
  kidney: { x: 190, y: 365 },
  lumbar_spine: { x: 190, y: 370 },
  pelvis: { x: 189, y: 423 },
  hip: { x: 189, y: 435 },
  bladder: { x: 190, y: 445 },
  reproductive: { x: 190, y: 455 },
  shoulder: { x: 190, y: 193 },
  right_arm: { x: 78, y: 308 },
  left_arm: { x: 302, y: 308 },
  right_hand: { x: 51, y: 422 },
  left_hand: { x: 327, y: 422 },
  right_leg: { x: 138, y: 592 },
  left_leg: { x: 237, y: 594 },
  right_foot: { x: 138, y: 732 },
  left_foot: { x: 240, y: 732 },
};

/** Fallback when only a zone (not a specific organ) has records. */
export const ZONE_DOT_ANCHORS: Record<BodyZone, DotAnchor> = {
  head_neck: PART_DOT_ANCHORS.head,
  chest: PART_DOT_ANCHORS.heart,
  abdomen: PART_DOT_ANCHORS.intestines,
  pelvis: PART_DOT_ANCHORS.pelvis,
  right_arm: PART_DOT_ANCHORS.right_arm,
  left_arm: PART_DOT_ANCHORS.left_arm,
  right_leg: PART_DOT_ANCHORS.right_leg,
  left_leg: PART_DOT_ANCHORS.left_leg,
};

export function clampDotAnchor(anchor: DotAnchor): DotAnchor {
  return {
    x: Math.max(0, Math.min(ANATOMY_VIEWBOX.w, anchor.x)),
    y: Math.max(0, Math.min(ANATOMY_VIEWBOX.h, anchor.y)),
  };
}
