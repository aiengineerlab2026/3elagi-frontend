import type { ReactNode } from "react";

/** Native: render in place (absolute overlay is enough). */
export function viewportPortal(node: ReactNode): ReactNode {
  return node;
}
