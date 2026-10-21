import { create } from "zustand";
import { setPendingAuthReturn } from "@/domains/auth/pendingAuthReturn";

interface GuestAuthDialogState {
  visible: boolean;
  /** Optional deep link to open after successful login/signup (e.g. `/chat/:id`). */
  returnTo: string | null;
  open: (returnTo?: string | null) => void;
  close: () => void;
}

/** Global guest “please log in / sign up” dialog (e.g. tapping a doctor while logged out). */
export const useGuestAuthDialogStore = create<GuestAuthDialogState>((set) => ({
  visible: false,
  returnTo: null,
  open: (returnTo) => {
    const href = returnTo?.trim() || null;
    if (href) setPendingAuthReturn(href);
    set({ visible: true, returnTo: href });
  },
  close: () => set({ visible: false }),
}));
