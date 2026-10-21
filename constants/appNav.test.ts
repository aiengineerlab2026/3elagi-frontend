import { describe, expect, it, vi } from "vitest";

// The nav table only needs icons to exist — the real package fails to load
// outside a native runtime.
vi.mock("lucide-react-native", () => ({
  __esModule: true,
  default: {},
  ...Object.fromEntries(
    [
      "Activity",
      "Bell",
      "BookOpen",
      "Bot",
      "Building2",
      "CalendarClock",
      "ClipboardList",
      "Coins",
      "History",
      "Home",
      "Hospital",
      "Info",
      "ListChecks",
      "Scissors",
      "MessageSquare",
      "Star",
      "Stethoscope",
      "User",
      "Users",
    ].map((name) => [name, () => null]),
  ),
}));

const { filterAppNavItems, groupAppNavItems } = await import("@/constants/appNav");

const hrefs = (items: { href: unknown }[]) => items.map((i) => String(i.href));

describe("filterAppNavItems", () => {
  it("drops the assistant when AI is switched off", () => {
    expect(hrefs(filterAppNavItems("patient", { aiEnabled: false }))).not.toContain(
      "/(tabs)/assistant",
    );
  });

  it("keeps it for signed-in users, guests, and doctors when AI is on", () => {
    for (const role of ["patient", "doctor", null]) {
      expect(hrefs(filterAppNavItems(role, { aiEnabled: true }))).toContain(
        "/(tabs)/assistant",
      );
    }
  });

  it("defaults to showing it — callers that never heard of the switch keep working", () => {
    expect(hrefs(filterAppNavItems("patient"))).toContain("/(tabs)/assistant");
  });

  it("still filters by role while AI is off", () => {
    const patient = hrefs(filterAppNavItems("patient", { aiEnabled: false }));
    expect(patient).toContain("/(tabs)/records");
    expect(patient).not.toContain("/(tabs)/patients");
  });
});

describe("hospital nav", () => {
  it("shows hospitals only their own pages", () => {
    expect(hrefs(filterAppNavItems("hospital"))).toEqual([
      "/hospital",
      "/hospital/doctors",
      "/hospital/surgeries",
      "/hospital/availability",
      "/hospital/profile",
    ]);
  });

  it("never shows hospital pages to other roles or guests", () => {
    for (const role of ["patient", "doctor", "admin", null]) {
      expect(hrefs(filterAppNavItems(role)).some((h) => h.startsWith("/hospital"))).toBe(false);
    }
  });
});

describe("groupAppNavItems", () => {
  it("puts chat history, appointments, consultations and records under Activity", () => {
    const sections = groupAppNavItems(filterAppNavItems("patient"));
    const activity = sections.find((s) => s.group === "activity");
    expect(activity && hrefs(activity.items)).toEqual([
      "/(tabs)/history",
      "/(tabs)/appointments",
      "/(tabs)/reservations",
      "/(tabs)/consultations",
      "/(tabs)/records",
    ]);
  });

  it("keeps every named group in one section and loses no item", () => {
    for (const role of ["patient", "doctor"]) {
      const items = filterAppNavItems(role);
      const sections = groupAppNavItems(items);
      // Order and membership survive the split. Ungrouped items may form more
      // than one section (before and after Activity); named groups may not.
      expect(sections.flatMap((s) => hrefs(s.items))).toEqual(hrefs(items));
      const named = sections.map((s) => s.group).filter(Boolean);
      expect(new Set(named).size).toBe(named.length);
    }
  });

  it("keeps Activity last in the menu", () => {
    const sections = groupAppNavItems(filterAppNavItems("patient"));
    expect(sections[sections.length - 1].group).toBe("activity");
  });

  it("drops medical records from a doctor's Activity section", () => {
    const sections = groupAppNavItems(filterAppNavItems("doctor"));
    const activity = sections.find((s) => s.group === "activity");
    expect(activity && hrefs(activity.items)).not.toContain("/(tabs)/records");
  });
});
