import type { ComponentType } from "react";
import type { SvgProps } from "react-native-svg";
import {
  Arm,
  Bladder,
  Body,
  Colon,
  Ear,
  EarsNoseAndThroat,
  Eye,
  FemaleReproductiveSystem,
  Foot,
  Gallbladder,
  Head,
  HeartOrgan,
  Joints,
  Kidneys,
  Leg,
  Liver,
  Lungs,
  Neurology,
  Pancreas,
  Skeleton,
  Spine,
  Spleen,
  Stomach,
  Thyroid,
} from "healthicons-react-native/filled";
import type { BodyPart, BodyZone } from "@/domains/medical/bodyParts";

/** Health Icons SVG component (from https://healthicons.org/). */
export type HealthIcon = ComponentType<SvgProps>;

export const BODY_ZONE_ICONS: Record<BodyZone, HealthIcon> = {
  head_neck: Head,
  chest: Lungs,
  abdomen: Stomach,
  pelvis: Skeleton,
  left_arm: Arm,
  right_arm: Arm,
  left_leg: Leg,
  right_leg: Leg,
};

/**
 * Maps each medical body part to the matching Health Icons glyph.
 * @see https://healthicons.org/ (body category)
 */
export const BODY_PART_ICONS: Record<BodyPart, HealthIcon> = {
  general: Body,
  head: Neurology,
  neck: Spine,
  eyes: Eye,
  ears: Ear,
  throat: EarsNoseAndThroat,
  thyroid: Thyroid,
  shoulder: Joints,
  left_arm: Arm,
  right_arm: Arm,
  left_hand: Arm,
  right_hand: Arm,
  chest: Lungs,
  thoracic_spine: Spine,
  lumbar_spine: Spine,
  back: Spine,
  heart: HeartOrgan,
  lungs: Lungs,
  abdomen: Body,
  stomach: Stomach,
  liver: Liver,
  gallbladder: Gallbladder,
  pancreas: Pancreas,
  spleen: Spleen,
  intestines: Colon,
  kidney: Kidneys,
  pelvis: Skeleton,
  hip: Joints,
  bladder: Bladder,
  reproductive: FemaleReproductiveSystem,
  left_leg: Leg,
  right_leg: Leg,
  left_foot: Foot,
  right_foot: Foot,
};

/** Renders a Health Icon with Lucide-like size/color props. */
export function BodyPartIcon({
  icon: Icon,
  size = 18,
  color = "#111",
}: {
  icon: HealthIcon;
  size?: number;
  color?: string;
}) {
  return <Icon width={size} height={size} color={color} />;
}
