import type { Translations } from "@/constants/translations";
import {
  tourStepsForPhase,
  type DoctorTourPhase,
  type TourStep,
  type TourStepDef,
} from "@/domains/onboarding/productTourStore";

export type ProductTourCopy = Translations["productTour"];

function stepStrings(
  copy: ProductTourCopy,
  id: string,
): Pick<TourStep, "message" | "title" | "description" | "primaryCta"> {
  const block = copy.steps[id as keyof ProductTourCopy["steps"]];
  if (!block) return { message: id };
  return {
    message: block.message,
    title: block.title,
    description: block.description,
    primaryCta: block.primaryCta,
  };
}

export function localizeTourStep(def: TourStepDef, copy: ProductTourCopy): TourStep {
  return { ...def, ...stepStrings(copy, def.id) };
}

export function localizeTourSteps(defs: TourStepDef[], copy: ProductTourCopy): TourStep[] {
  return defs.map((def) => localizeTourStep(def, copy));
}

export function currentLocalizedTourStep(
  phase: DoctorTourPhase,
  index: number,
  copy: ProductTourCopy,
): TourStep | null {
  const def = tourStepsForPhase(phase)[index];
  return def ? localizeTourStep(def, copy) : null;
}
