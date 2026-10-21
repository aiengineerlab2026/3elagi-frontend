import { create } from "zustand";

export type DoctorTourPhase = "main" | null;

export type TourAnchor =
  | "nav-history"
  | "chat-test-row"
  | "chat-view-records"
  | "records-skeleton-toggle"
  | "records-skeleton-body"
  | "records-record-row"
  | "records-back"
  | "records-reset";

export interface TourStep {
  id: string;
  anchor: TourAnchor;
  /** Short instruction for bottom-bar steps. */
  message: string;
  /** Rich popover title (contextual steps). */
  title?: string;
  /** Rich popover body (contextual steps). */
  description?: string;
  /** Primary button label on contextual popovers. */
  primaryCta?: string;
  /** Tooltip placement strategy. */
  placement?: "bottom" | "contextual";
  /** Route to open before highlighting (optional). */
  route?: string;
  /** Wait for user to tap the anchor before advancing. */
  waitForTap?: boolean;
}

/** Structural tour step — copy comes from translations via productTourCopy. */
export type TourStepDef = Omit<
  TourStep,
  "message" | "title" | "description" | "primaryCta"
>;

interface ProductTourState {
  phase: DoctorTourPhase;
  stepIndex: number;
  active: boolean;
  testPatientUserId: string | null;
  /** Set when the tour ends so bootstrap can persist completion after the last tap step. */
  exitReason: "skip" | "complete" | null;
  completedPhase: DoctorTourPhase;
  setTestPatientUserId: (id: string | null) => void;
  startMainTour: () => void;
  next: () => void;
  skip: () => void;
  clearExit: () => void;
  completePhase: () => void;
  advanceOnAnchorTap: (anchor: TourAnchor) => void;
}

export const MAIN_DOCTOR_TOUR: TourStepDef[] = [
  {
    id: "open-history",
    anchor: "nav-history",
    route: "/(tabs)",
    waitForTap: true,
  },
  {
    id: "open-test-chat",
    anchor: "chat-test-row",
    route: "/(tabs)/history",
    waitForTap: true,
  },
  {
    id: "view-records",
    anchor: "chat-view-records",
    placement: "contextual",
    waitForTap: true,
  },
  {
    id: "skeleton-toggle",
    anchor: "records-skeleton-toggle",
    waitForTap: true,
  },
  {
    id: "skeleton-body",
    anchor: "records-skeleton-body",
    waitForTap: true,
  },
];

export function tourRouteForStep(
  step: TourStepDef | null,
  testPatientUserId: string | null,
): string | undefined {
  if (!step) return undefined;
  if (step.route) return step.route;
  if (!testPatientUserId) return undefined;
  if (step.anchor === "chat-view-records") {
    return `/chat/${testPatientUserId}`;
  }
  if (
    [
      "records-skeleton-toggle",
      "records-skeleton-body",
    ].includes(step.anchor)
  ) {
    return `/patients/${testPatientUserId}`;
  }
  return undefined;
}

function tourPathHas(path: string, segment: string): boolean {
  return path.includes(`/${segment}`) || path.endsWith(segment);
}

/** True when the app is already on the screen the tour step wants to open. */
export function isTourRouteActive(pathname: string | null, route: string): boolean {
  if (!pathname) return false;
  const path = pathname.replace(/\/$/, "") || "/";
  const target = route.replace(/\/$/, "") || "/";

  if (path === target) return true;

  if (target === "/(tabs)") {
    return (
      path === "/" ||
      path === "/(tabs)" ||
      (path.includes("(tabs)") &&
        !tourPathHas(path, "history") &&
        !tourPathHas(path, "records") &&
        !tourPathHas(path, "patients") &&
        !tourPathHas(path, "chat"))
    );
  }

  if (target === "/(tabs)/history") return tourPathHas(path, "history");

  const chatMatch = target.match(/^\/chat\/([^/]+)$/);
  if (chatMatch) return new RegExp(`^/chat/${chatMatch[1]}$`).test(path);

  const patientMatch = target.match(/^\/patients\/([^/]+)$/);
  if (patientMatch) return new RegExp(`^/patients/${patientMatch[1]}$`).test(path);

  return path.includes(target.slice(1));
}

export const useProductTourStore = create<ProductTourState>((set, get) => ({
  phase: null,
  stepIndex: 0,
  active: false,
  testPatientUserId: null,
  exitReason: null,
  completedPhase: null,
  setTestPatientUserId: (id) => set({ testPatientUserId: id }),
  startMainTour: () =>
    set({
      phase: "main",
      stepIndex: 0,
      active: true,
      exitReason: null,
      completedPhase: null,
    }),
  next: () => {
    const { phase, stepIndex } = get();
    const steps = MAIN_DOCTOR_TOUR;
    if (stepIndex + 1 >= steps.length) {
      set({
        active: false,
        phase: null,
        stepIndex: 0,
        exitReason: "complete",
        completedPhase: phase,
      });
      return;
    }
    set({ stepIndex: stepIndex + 1, exitReason: null });
  },
  skip: () =>
    set({
      active: false,
      phase: null,
      stepIndex: 0,
      exitReason: "skip",
      completedPhase: null,
    }),
  clearExit: () => set({ exitReason: null, completedPhase: null }),
  completePhase: () =>
    set({
      active: false,
      phase: null,
      stepIndex: 0,
      exitReason: null,
      completedPhase: null,
    }),
  advanceOnAnchorTap: (anchor) => {
    const { active, phase, stepIndex } = get();
    if (!active) return;
    const step = currentTourStepDef(phase, stepIndex);
    if (step?.waitForTap && step.anchor === anchor) {
      get().next();
    }
  },
}));

export function tourStepsForPhase(phase: DoctorTourPhase): TourStepDef[] {
  if (phase === "main") return MAIN_DOCTOR_TOUR;
  return [];
}

export function currentTourStepDef(phase: DoctorTourPhase, index: number): TourStepDef | null {
  const steps = tourStepsForPhase(phase);
  return steps[index] ?? null;
}

/** @deprecated Use currentTourStepDef for anchor checks, or currentLocalizedTourStep for UI copy. */
export function currentTourStep(phase: DoctorTourPhase, index: number): TourStepDef | null {
  return currentTourStepDef(phase, index);
}

export function currentTourSteps(phase: DoctorTourPhase): TourStepDef[] {
  return tourStepsForPhase(phase);
}
