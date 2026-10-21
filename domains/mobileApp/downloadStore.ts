import { create } from "zustand";

interface MobileAppDownloadState {
  open: boolean;
  openDownload: () => void;
  closeDownload: () => void;
}

/**
 * The download dialog lives at the app root, not inside whatever opened it.
 * On mobile web the link sits in the side drawer, and closing the drawer
 * unmounted the dialog with it — the tap looked like it did nothing.
 */
export const useMobileAppDownloadStore = create<MobileAppDownloadState>((set) => ({
  open: false,
  openDownload: () => set({ open: true }),
  closeDownload: () => set({ open: false }),
}));
