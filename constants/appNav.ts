import type { Href } from "expo-router";
import {
  Activity,
  Bell,
  BookOpen,
  Building2,
  CalendarClock,
  ClipboardList,
  History,
  Hospital,
  Home,
  Info,
  ListChecks,
  Scissors,
  MessageSquare,
  Star,
  Stethoscope,
  User,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import type { Translations } from "@/constants/translations";

/** Section headers in the side menu. */
export type AppNavGroup = "activity";

/** Icon shown on the group's own row, like any other menu item. */
export const APP_NAV_GROUP_ICONS: Record<AppNavGroup, LucideIcon> = {
  activity: Activity,
};

export type AppNavItem = {
  href: Href;
  labelKey: keyof Translations["tabs"];
  Icon: LucideIcon;
  doctorOnly?: boolean;
  patientOnly?: boolean;
  /** Hospital accounts see only these items; other roles never do. */
  hospitalOnly?: boolean;
  /** Visible without signing in (home / doctor browse). */
  guestAllowed?: boolean;
  /** Marketing pages that only make sense before signing in. */
  guestOnly?: boolean;
  /** Hidden when AI is switched off in the profile. */
  aiOnly?: boolean;
  /** Items sharing a group render under one section header. */
  group?: AppNavGroup;
  match: (path: string) => boolean;
};

/** Fired when Home is tapped in the nav; the home tab resets to the specialities grid. */
export const HOME_NAV_RESET_EVENT = "home-nav:reset";

function pathHas(path: string, segment: string) {
  return path.includes(`/${segment}`) || path.endsWith(segment);
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    href: "/hospital",
    labelKey: "hospitalReservations",
    Icon: ClipboardList,
    hospitalOnly: true,
    match: (path) => path === "/hospital" || path === "/hospital/",
  },
  {
    href: "/hospital/doctors",
    labelKey: "hospitalDoctors",
    Icon: Stethoscope,
    hospitalOnly: true,
    match: (path) => path.startsWith("/hospital/doctors"),
  },
  {
    href: "/hospital/surgeries",
    labelKey: "hospitalSurgeries",
    Icon: Scissors,
    hospitalOnly: true,
    match: (path) => path.startsWith("/hospital/surgeries"),
  },
  {
    href: "/hospital/availability",
    labelKey: "availability",
    Icon: CalendarClock,
    hospitalOnly: true,
    match: (path) => path.startsWith("/hospital/availability"),
  },
  {
    href: "/hospital/profile",
    labelKey: "hospitalProfile",
    Icon: Building2,
    hospitalOnly: true,
    match: (path) => path.startsWith("/hospital/profile"),
  },
  {
    href: "/(tabs)",
    labelKey: "home",
    Icon: Home,
    guestAllowed: true,
    match: (path) =>
      path === "/" ||
      path === "/(tabs)" ||
      path.endsWith("/index") ||
      (path.includes("(tabs)") &&
        !pathHas(path, "history") &&
        !pathHas(path, "records") &&
        !pathHas(path, "appointments") &&
        !pathHas(path, "consultations") &&
        !pathHas(path, "points") &&
        !pathHas(path, "profile") &&
        !pathHas(path, "assistant") &&
        !pathHas(path, "intake") &&
        !pathHas(path, "reviews") &&
        !pathHas(path, "patients") &&
        !pathHas(path, "activity") &&
        !pathHas(path, "notifications") &&
        !pathHas(path, "about-us") &&
        !pathHas(path, "faq") &&
        !pathHas(path, "for-doctors") &&
        !pathHas(path, "documentation")),
  },
  {
    href: "/(tabs)/about-us",
    labelKey: "aboutUs",
    Icon: Info,
    guestAllowed: true,
    guestOnly: true,
    match: (path) => pathHas(path, "about-us"),
  },
  {
    href: "/(tabs)/for-doctors",
    labelKey: "forDoctors",
    Icon: Stethoscope,
    guestAllowed: true,
    guestOnly: true,
    match: (path) => pathHas(path, "for-doctors"),
  },
  {
    href: "/(tabs)/notifications",
    labelKey: "notifications",
    Icon: Bell,
    match: (path) => pathHas(path, "notifications"),
  },
  {
    href: "/(tabs)/patients",
    labelKey: "patients",
    Icon: Users,
    doctorOnly: true,
    match: (path) => pathHas(path, "patients"),
  },
  {
    href: "/(tabs)/profile",
    labelKey: "profile",
    Icon: User,
    match: (path) => pathHas(path, "profile"),
  },
  {
    href: "/(tabs)/documentation",
    labelKey: "documentation",
    Icon: BookOpen,
    guestAllowed: true,
    match: (path) => pathHas(path, "documentation"),
  },
  // Grouped under the "Activity" header at the bottom, in this order.
  {
    href: "/(tabs)/history",
    labelKey: "history",
    Icon: History,
    group: "activity",
    match: (path) => pathHas(path, "history"),
  },
  {
    href: "/(tabs)/appointments",
    labelKey: "appointments",
    Icon: CalendarClock,
    group: "activity",
    match: (path) => pathHas(path, "appointments"),
  },
  {
    href: "/(tabs)/reservations",
    labelKey: "reservations",
    Icon: Hospital,
    patientOnly: true,
    group: "activity",
    match: (path) => pathHas(path, "reservations"),
  },
  {
    href: "/(tabs)/hospitals",
    labelKey: "hospitals",
    Icon: Hospital,
    doctorOnly: true,
    group: "activity",
    match: (path) => pathHas(path, "hospitals"),
  },
  {
    href: "/(tabs)/surgeries",
    labelKey: "surgeries",
    Icon: Scissors,
    doctorOnly: true,
    group: "activity",
    match: (path) => pathHas(path, "surgeries"),
  },
  {
    href: "/(tabs)/consultations",
    labelKey: "consultations",
    Icon: MessageSquare,
    group: "activity",
    match: (path) => pathHas(path, "consultations"),
  },
  {
    href: "/(tabs)/records",
    labelKey: "records",
    Icon: ClipboardList,
    patientOnly: true,
    group: "activity",
    match: (path) => pathHas(path, "records") || path.includes("/medical"),
  },
  {
    href: "/(tabs)/reviews",
    labelKey: "reviews",
    Icon: Star,
    doctorOnly: true,
    group: "activity",
    match: (path) => pathHas(path, "reviews"),
  },
  {
    href: "/(tabs)/intake",
    labelKey: "intake",
    Icon: ListChecks,
    doctorOnly: true,
    group: "activity",
    match: (path) => pathHas(path, "intake"),
  },
];

export function filterAppNavItems(
  role: string | null | undefined,
  options?: { signedIn?: boolean; aiEnabled?: boolean },
): AppNavItem[] {
  const signedIn = options?.signedIn ?? !!role;
  const aiEnabled = options?.aiEnabled ?? true;
  const isDoctor = role?.toLowerCase() === "doctor";
  const isHospital = role?.toLowerCase() === "hospital";
  return APP_NAV_ITEMS.filter((item) => {
    if (item.aiOnly && !aiEnabled) return false;
    if (!signedIn) return !!item.guestAllowed;
    if (isHospital) return !!item.hospitalOnly;
    if (item.hospitalOnly) return false;
    if (item.guestOnly) return false;
    if (item.doctorOnly && !isDoctor) return false;
    if (item.patientOnly && isDoctor) return false;
    return true;
  });
}

export type AppNavSection<T extends AppNavItem = AppNavItem> = {
  /** Header label; absent for the ungrouped items at the top. */
  group?: AppNavGroup;
  items: T[];
};

/**
 * Split a filtered nav list into render sections, preserving order. Grouped
 * items are contiguous in APP_NAV_ITEMS, so one pass is enough.
 */
export function groupAppNavItems<T extends AppNavItem>(
  items: T[],
): AppNavSection<T>[] {
  const sections: AppNavSection<T>[] = [];
  for (const item of items) {
    const last = sections[sections.length - 1];
    if (last && last.group === item.group) {
      last.items.push(item);
      continue;
    }
    sections.push({ group: item.group, items: [item] });
  }
  return sections;
}
