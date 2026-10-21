import { create } from "zustand";

interface Ask3elagiAiWidgetState {
  open: boolean;
  /** Desktop: expanded panel uses more viewport width. */
  expanded: boolean;
  /** Sent once when the panel opens / expands. */
  pendingQuestion: string | null;
  /** Open a specific AI conversation (e.g. from a notification tap). */
  pendingChatId: string | null;
  /** Scopes doctor AI answers to this patient (consultations + records). */
  patientUserId: string | null;
  openWidget: (
    question?: string,
    patientUserId?: string | null,
    chatId?: string | null,
  ) => void;
  closeWidget: () => void;
  toggleWidget: () => void;
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  setPatientUserId: (patientUserId: string | null) => void;
  clearPendingChatId: () => void;
  consumePendingQuestion: () => string | null;
}

/** Global Ask 3elagi AI chat widget — open from any screen. */
export const useAsk3elagiAiWidgetStore = create<Ask3elagiAiWidgetState>(
  (set, get) => ({
    open: false,
    expanded: false,
    pendingQuestion: null,
    pendingChatId: null,
    patientUserId: null,
    openWidget: (question, patientUserId, chatId) =>
      set((state) => ({
        open: true,
        pendingQuestion: question?.trim() || state.pendingQuestion,
        pendingChatId:
          chatId !== undefined ? chatId?.trim() || null : state.pendingChatId,
        patientUserId:
          patientUserId !== undefined
            ? patientUserId?.trim() || null
            : state.patientUserId,
      })),
    closeWidget: () =>
      set({
        open: false,
        expanded: false,
        pendingQuestion: null,
        pendingChatId: null,
        patientUserId: null,
      }),
    toggleWidget: () =>
      set((s) => ({
        open: !s.open,
        expanded: s.open ? false : s.expanded,
        pendingQuestion: s.open ? null : s.pendingQuestion,
        patientUserId: s.open ? null : s.patientUserId,
      })),
    setExpanded: (expanded) => set({ expanded }),
    toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),
    setPatientUserId: (patientUserId) =>
      set({ patientUserId: patientUserId?.trim() || null }),
    clearPendingChatId: () => set({ pendingChatId: null }),
    consumePendingQuestion: () => {
      const q = get().pendingQuestion;
      if (q) set({ pendingQuestion: null });
      return q;
    },
  }),
);

export function openAsk3elagiAi(question?: string, patientUserId?: string | null) {
  useAsk3elagiAiWidgetStore.getState().openWidget(question, patientUserId);
}

export function openAsk3elagiAiWithChat(chatId: string) {
  const id = chatId.trim();
  if (!id) return;
  useAsk3elagiAiWidgetStore.getState().openWidget(undefined, undefined, id);
}

export function closeAsk3elagiAi() {
  useAsk3elagiAiWidgetStore.getState().closeWidget();
}
