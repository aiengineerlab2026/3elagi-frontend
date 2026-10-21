import { create } from "zustand";
import type { LayoutRectangle } from "react-native";

type AnchorRects = Record<string, LayoutRectangle>;

interface TourAnchorState {
  rects: AnchorRects;
  setRect: (id: string, rect: LayoutRectangle | null) => void;
  clear: () => void;
}

export const useTourAnchorStore = create<TourAnchorState>((set) => ({
  rects: {},
  setRect: (id, rect) =>
    set((state) => {
      if (!rect) {
        const { [id]: _removed, ...rest } = state.rects;
        return { rects: rest };
      }
      return { rects: { ...state.rects, [id]: rect } };
    }),
  clear: () => set({ rects: {} }),
}));

function pickBestRect(nodes: NodeListOf<Element> | Element[]): LayoutRectangle | null {
  let best: LayoutRectangle | null = null;
  let bestArea = 0;

  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    const area = r.width * r.height;
    if (area > bestArea && r.width >= 1 && r.height >= 1) {
      bestArea = area;
      best = { x: r.left, y: r.top, width: r.width, height: r.height };
    }
  }

  return best;
}

/** Finds the best visible DOM rect for a tour anchor on web. */
export function measureAnchorOnWeb(anchorId: string, testId?: string): LayoutRectangle | null {
  if (typeof document === "undefined") return null;

  const selectors = [
    `[data-tour-anchor="${anchorId}"]`,
    `[data-testid="${testId ?? anchorId}"]`,
    `[data-testid="${anchorId}"]`,
    `#tour-anchor-${anchorId}`,
    `#${anchorId}`,
  ];

  let best: LayoutRectangle | null = null;
  let bestArea = 0;

  const consider = (rect: LayoutRectangle | null) => {
    if (!rect) return;
    const area = rect.width * rect.height;
    if (area > bestArea) {
      bestArea = area;
      best = rect;
    }
  };

  for (const selector of selectors) {
    try {
      consider(pickBestRect(document.querySelectorAll(selector)));
    } catch {
      // ignore invalid selectors
    }
  }

  return best;
}

/** Web-only dataset prop for tour targets. */
export function tourAnchorDataSet(anchorId: string): { dataSet: { tourAnchor: string } } | undefined {
  return { dataSet: { tourAnchor: anchorId } };
}
