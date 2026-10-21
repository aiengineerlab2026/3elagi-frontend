import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/** Web: mount on document.body so `position: fixed` tracks the viewport. */
export function viewportPortal(node: ReactNode): ReactNode {
  if (typeof document === "undefined") return node;
  return createPortal(node, document.body);
}
