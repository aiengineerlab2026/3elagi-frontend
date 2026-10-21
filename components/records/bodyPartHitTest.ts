import { ZONE_PATHS } from "@/components/records/bodyPartShapes";
import type { BodyZone } from "@/domains/medical/bodyParts";

type Pt = { x: number; y: number };

export type ZoneBBox = { minX: number; minY: number; maxX: number; maxY: number };

/**
 * Paint / overlay order (later = higher z-index).
 * Chest after abdomen so ribcage/heart taps are not stolen by abdomen.
 * Limbs last so side taps win over torso.
 */
export const HIT_ORDER: BodyZone[] = [
  "head_neck",
  "abdomen",
  "pelvis",
  "chest",
  "right_leg",
  "left_leg",
  "right_arm",
  "left_arm",
];

/** Resolve order when a point matches multiple zones. */
const HIT_PRIORITY: BodyZone[] = [
  "left_arm",
  "right_arm",
  "left_leg",
  "right_leg",
  "head_neck",
  "chest", // before abdomen — heart/lungs stay in chest
  "abdomen",
  "pelvis",
];

function parsePathPoints(d: string): Pt[] {
  const nums = d.match(/-?\d+(?:\.\d+)?/g);
  if (!nums) return [];
  const pts: Pt[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pts.push({ x: Number(nums[i]), y: Number(nums[i + 1]) });
  }
  return pts;
}

function bboxOf(pts: Pt[]): ZoneBBox | null {
  if (pts.length < 3) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

export const ZONE_POLYGONS: Record<BodyZone, Pt[]> = Object.fromEntries(
  (Object.keys(ZONE_PATHS) as BodyZone[]).map((zone) => [
    zone,
    parsePathPoints(ZONE_PATHS[zone]),
  ]),
) as Record<BodyZone, Pt[]>;

export const ZONE_BBOXES: Record<BodyZone, ZoneBBox> = Object.fromEntries(
  (Object.keys(ZONE_PATHS) as BodyZone[]).map((zone) => {
    const box = bboxOf(ZONE_POLYGONS[zone]);
    return [zone, box ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 }];
  }),
) as Record<BodyZone, ZoneBBox>;

/** Ray-cast point-in-polygon (even-odd). */
export function pointInPolygon(x: number, y: number, polygon: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Map a tap in viewBox coords → body zone (or null). */
export function zoneAtViewPoint(x: number, y: number): BodyZone | null {
  for (const zone of HIT_PRIORITY) {
    const poly = ZONE_POLYGONS[zone];
    if (poly.length >= 3 && pointInPolygon(x, y, poly)) return zone;
  }
  for (const zone of HIT_PRIORITY) {
    const box = ZONE_BBOXES[zone];
    if (
      x >= box.minX &&
      x <= box.maxX &&
      y >= box.minY &&
      y <= box.maxY
    ) {
      return zone;
    }
  }
  return null;
}
