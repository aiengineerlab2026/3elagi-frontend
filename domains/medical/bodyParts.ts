export const BODY_PARTS = [
  "general",
  // Head & neck
  "head",
  "neck",
  "eyes",
  "ears",
  "throat",
  "thyroid",
  // Chest
  "chest",
  "thoracic_spine",
  "back",
  "heart",
  "lungs",
  // Abdomen
  "abdomen",
  "stomach",
  "liver",
  "gallbladder",
  "pancreas",
  "spleen",
  "intestines",
  "kidney",
  "lumbar_spine",
  // Pelvis
  "pelvis",
  "hip",
  "bladder",
  "reproductive",
  // Upper limbs
  "shoulder",
  "left_arm",
  "right_arm",
  "left_hand",
  "right_hand",
  // Lower limbs
  "left_leg",
  "right_leg",
  "left_foot",
  "right_foot",
] as const;

export type BodyPart = (typeof BODY_PARTS)[number];

export const BODY_ZONES = [
  "head_neck",
  "chest",
  "abdomen",
  "pelvis",
  "left_arm",
  "right_arm",
  "left_leg",
  "right_leg",
] as const;
export type BodyZone = (typeof BODY_ZONES)[number];

/** Parts shown when a skeleton zone is opened (excludes `general`). */
export const BODY_PARTS_BY_ZONE: Record<BodyZone, readonly Exclude<BodyPart, "general">[]> = {
  head_neck: ["head", "neck", "eyes", "ears", "throat", "thyroid"],
  chest: ["chest", "thoracic_spine", "back", "heart", "lungs"],
  abdomen: [
    "abdomen",
    "stomach",
    "liver",
    "gallbladder",
    "pancreas",
    "spleen",
    "intestines",
    "kidney",
    "lumbar_spine",
  ],
  pelvis: ["pelvis", "hip", "bladder", "reproductive"],
  left_arm: ["shoulder", "left_arm", "left_hand"],
  right_arm: ["shoulder", "right_arm", "right_hand"],
  left_leg: ["left_leg", "left_foot"],
  right_leg: ["right_leg", "right_foot"],
};

/** Skeleton diagram regions (excludes general — shown as a chip). */
export const SKELETON_BODY_PARTS = BODY_PARTS.filter(
  (p): p is Exclude<BodyPart, "general"> => p !== "general",
);

export function isBodyPart(value: unknown): value is BodyPart {
  return typeof value === "string" && (BODY_PARTS as readonly string[]).includes(value);
}

/** Localized / free-text labels → canonical keys (AI often returns Arabic). */
const BODY_PART_ALIASES: Record<string, BodyPart> = {
  brain: "head",
  "head & brain": "head",
  "head and brain": "head",
  eye: "eyes",
  ear: "ears",
  arm: "left_arm",
  arms: "left_arm",
  forearm: "left_arm",
  "fore arm": "left_arm",
  "upper arm": "left_arm",
  "upper limb": "left_arm",
  elbow: "left_arm",
  wrist: "left_hand",
  radius: "left_arm",
  ulna: "left_arm",
  humerus: "left_arm",
  "broken arm": "left_arm",
  "fractured arm": "left_arm",
  "arm fracture": "left_arm",
  "forearm fracture": "left_arm",
  "radius and ulna": "left_arm",
  "left arm": "left_arm",
  "right arm": "right_arm",
  "left forearm": "left_arm",
  "right forearm": "right_arm",
  hand: "left_hand",
  "left hand": "left_hand",
  "right hand": "right_hand",
  leg: "left_leg",
  foot: "left_foot",
  ankle: "left_foot",
  knee: "left_leg",
  thigh: "left_leg",
  tibia: "left_leg",
  fibula: "left_leg",
  femur: "left_leg",
  kidneys: "kidney",
  عام: "general",
  الرأس: "head",
  الدماغ: "head",
  "الرأس والدماغ": "head",
  الرقبة: "neck",
  "الفقرات العنقية": "neck",
  "الرقبة والفقرات العنقية": "neck",
  العين: "eyes",
  العينان: "eyes",
  العيون: "eyes",
  الأذن: "ears",
  الأذنان: "ears",
  الأنف: "throat",
  الحلق: "throat",
  الفم: "throat",
  "الأنف والحلق والفم": "throat",
  "الغدة الدرقية": "thyroid",
  الكتف: "shoulder",
  "حزام الكتف": "shoulder",
  الذراع: "left_arm",
  "الذراع الأيسر": "left_arm",
  "الذراع الأيمن": "right_arm",
  اليد: "left_hand",
  "اليد اليسرى": "left_hand",
  "اليد اليمنى": "right_hand",
  الصدر: "chest",
  "القفص الصدري": "chest",
  "العمود الصدري": "thoracic_spine",
  "العمود القطني": "lumbar_spine",
  الظهر: "back",
  القلب: "heart",
  "القلب والأوعية": "heart",
  الرئة: "lungs",
  الرئتان: "lungs",
  "الرئتان والمسالك الهوائية": "lungs",
  البطن: "abdomen",
  المعدة: "stomach",
  الكبد: "liver",
  المرارة: "gallbladder",
  البنكرياس: "pancreas",
  الطحال: "spleen",
  الأمعاء: "intestines",
  الكلى: "kidney",
  الكلية: "kidney",
  الحوض: "pelvis",
  الورك: "hip",
  "مفصل الورك": "hip",
  المثانة: "bladder",
  "الأعضاء التناسلية": "reproductive",
  الساق: "left_leg",
  "الساق اليسرى": "left_leg",
  "الساق اليمنى": "right_leg",
  القدم: "left_foot",
  "القدم اليسرى": "left_foot",
  "القدم اليمنى": "right_foot",
};

export function parseBodyPart(value: unknown): BodyPart | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const raw = value.trim();
  if (!raw) return undefined;

  const snake = raw.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (isBodyPart(snake)) return snake;

  const compact = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const direct =
    BODY_PART_ALIASES[compact] ??
    BODY_PART_ALIASES[raw] ??
    BODY_PART_ALIASES[snake.replace(/_/g, " ")];
  if (direct) return direct;

  // Prefer longest alias so "اليد اليمنى" does not match "اليد" → left_hand.
  let best: { part: BodyPart; len: number } | undefined;
  for (const [alias, part] of Object.entries(BODY_PART_ALIASES)) {
    if (alias.length < 3) continue;
    if (compact.includes(alias) || raw.includes(alias)) {
      if (!best || alias.length > best.len) best = { part, len: alias.length };
    }
  }
  return best?.part;
}

/** Infer a non-general body part from free text when AI omits/returns general. */
export function inferBodyPartFromText(
  ...texts: Array<string | null | undefined>
): BodyPart | undefined {
  let best: { part: BodyPart; len: number } | undefined;
  for (const text of texts) {
    if (!text?.trim()) continue;
    const part = parseBodyPart(text);
    if (!part || part === "general") continue;
    const compact = text.toLowerCase().replace(/\s+/g, " ").trim();
    let matchLen = part.length;
    for (const [alias, mapped] of Object.entries(BODY_PART_ALIASES)) {
      if (mapped !== part || alias.length < 3) continue;
      if (compact.includes(alias)) matchLen = Math.max(matchLen, alias.length);
    }
    if (!best || matchLen > best.len) best = { part, len: matchLen };
  }
  return best?.part;
}

export function zoneForBodyPart(part: BodyPart): BodyZone | null {
  if (part === "general") return null;
  for (const zone of BODY_ZONES) {
    if ((BODY_PARTS_BY_ZONE[zone] as readonly string[]).includes(part)) return zone;
  }
  return null;
}
