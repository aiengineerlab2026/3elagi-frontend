import type { TourAnchor } from "@/domains/onboarding/productTourStore";

const handlers: Partial<Record<TourAnchor, () => void>> = {};

/** Lets tour popovers invoke the same action as the highlighted control. */
export function registerTourAnchorHandler(anchor: TourAnchor, fn: () => void): () => void {
  handlers[anchor] = fn;
  return () => {
    if (handlers[anchor] === fn) delete handlers[anchor];
  };
}

export function invokeTourAnchorHandler(anchor: TourAnchor): boolean {
  const fn = handlers[anchor];
  if (!fn) return false;
  fn();
  return true;
}
