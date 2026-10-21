import type { ImageSourcePropType } from "react-native";
import {
  Ambulance,
  Apple,
  Baby,
  Bone,
  Brain,
  Eye,
  Heart,
  type LucideIcon,
  Scissors,
  Smile,
  Salad,
  Sparkles,
  Stethoscope,
  Venus,
} from "lucide-react-native";

interface SpecialityVisual {
  icon: LucideIcon;
  color: string;
  /** Bundled expressive illustration for specialty cards. */
  image?: ImageSourcePropType;
  /** Default is contain; cover fills circular tiles edge-to-edge. */
  imageResizeMode?: "contain" | "cover";
}

const SPECIALITY_IMAGES: Record<string, ImageSourcePropType> = {
  "General Medicine": require("@/assets/images/specialities/general-medicine.png"),
  Cardiology: require("@/assets/images/specialities/cardiology.png"),
  Dermatology: require("@/assets/images/specialities/dermatology.png"),
  Pediatrics: require("@/assets/images/specialities/pediatrics.png"),
  Orthopedics: require("@/assets/images/specialities/orthopedics.png"),
  Neurology: require("@/assets/images/specialities/neurology.png"),
  Ophthalmology: require("@/assets/images/specialities/ophthalmology.png"),
  Dentistry: require("@/assets/images/specialities/dentistry.png"),
  Surgery: require("@/assets/images/specialities/surgery.png"),
  Emergency: require("@/assets/images/specialities/emergency.png"),
  Gynaecology: require("@/assets/images/specialities/gynaecology.png"),
  Nutritionist: require("@/assets/images/specialities/nutritionist.png"),
  ENT: require("@/assets/images/specialities/ent.png"),
  Gastroenterology: require("@/assets/images/specialities/gastroenterology.png"),
};

/** Accent color + Lucide fallback + local illustration per speciality. */
const SPECIALITY_VISUALS: Record<string, SpecialityVisual> = {
  "General Medicine": {
    icon: Stethoscope,
    color: "#0d9488",
    image: SPECIALITY_IMAGES["General Medicine"],
  },
  Cardiology: {
    icon: Heart,
    color: "#e11d48",
    image: SPECIALITY_IMAGES.Cardiology,
  },
  Dermatology: {
    icon: Sparkles,
    color: "#0284c7",
    image: SPECIALITY_IMAGES.Dermatology,
  },
  Pediatrics: {
    icon: Baby,
    color: "#f59e0b",
    image: SPECIALITY_IMAGES.Pediatrics,
  },
  Orthopedics: {
    icon: Bone,
    color: "#4f46e5",
    image: SPECIALITY_IMAGES.Orthopedics,
  },
  Neurology: {
    icon: Brain,
    color: "#7c3aed",
    image: SPECIALITY_IMAGES.Neurology,
  },
  Ophthalmology: {
    icon: Eye,
    color: "#0891b2",
    image: SPECIALITY_IMAGES.Ophthalmology,
  },
  Dentistry: {
    icon: Smile,
    color: "#0d9488",
    image: SPECIALITY_IMAGES.Dentistry,
  },
  Surgery: {
    icon: Scissors,
    color: "#0f766e",
    image: SPECIALITY_IMAGES.Surgery,
  },
  Emergency: {
    icon: Ambulance,
    color: "#059669",
    image: SPECIALITY_IMAGES.Emergency,
  },
  Gynaecology: {
    icon: Venus,
    color: "#db2777",
    image: SPECIALITY_IMAGES.Gynaecology,
  },
  Nutritionist: {
    icon: Apple,
    color: "#16a34a",
    image: SPECIALITY_IMAGES.Nutritionist,
  },
  ENT: {
    icon: Stethoscope,
    color: "#dc2626",
    image: SPECIALITY_IMAGES.ENT,
    imageResizeMode: "cover",
  },
  Gastroenterology: {
    icon: Salad,
    color: "#ea580c",
    image: SPECIALITY_IMAGES.Gastroenterology,
  },
};

const FALLBACK: SpecialityVisual = { icon: Stethoscope, color: "#3057F2" };

export function specialityVisual(nameEn: string): SpecialityVisual {
  return SPECIALITY_VISUALS[nameEn] ?? FALLBACK;
}

/** Shift a #rrggbb hex by amt (−255..255) per channel. */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Light→base diagonal gradient for the icon orb fallback. */
export function specialityGradient(color: string): readonly [string, string] {
  return [shade(color, 42), color];
}
