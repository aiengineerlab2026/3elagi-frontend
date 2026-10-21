import { create } from "zustand";
import { on } from "@/utils/eventBus";
import { AUTH_EVENTS } from "@/domains/auth/events";
import { CHAT_EVENTS } from "@/domains/chat/events";
import { AI_EVENTS } from "@/domains/ai/events";
import type { AuthLogoutPayload } from "@/domains/auth/events";
import type { ChatMessageSentPayload } from "@/domains/chat/events";
import type { AiMessageSentPayload } from "@/domains/ai/events";
import type { MedicalPrescriptionScannedPayload } from "@/domains/medical/events";
import { MEDICAL_EVENTS } from "@/domains/medical/events";
import { addMessagePoints, fetchPointsBalance, type PointsSummary, DEFAULT_AVAILABLE_POINTS } from "./api";

interface PointsState {
  summary: PointsSummary | null;
  loading: boolean;
  loadPoints: (token: string | null) => Promise<void>;
  applySummary: (summary: PointsSummary) => void;
  addPoints: (token: string, amount: number) => Promise<PointsSummary>;
  clear: () => void;
}

const EMPTY: PointsSummary = {
  message_points: DEFAULT_AVAILABLE_POINTS,
  points_spent_total: 0,
  points_purchased_total: 0,
};

export const usePointsStore = create<PointsState>((set, get) => ({
  summary: null,
  loading: false,

  loadPoints: async (token) => {
    if (!token) {
      set({ summary: null, loading: false });
      return;
    }
    set({ loading: true });
    try {
      const summary = await fetchPointsBalance(token);
      set({ summary, loading: false });
    } catch {
      set({ summary: get().summary ?? EMPTY, loading: false });
    }
  },

  applySummary: (summary) => set({ summary }),

  addPoints: async (token, amount) => {
    const summary = await addMessagePoints(token, amount);
    set({ summary });
    return summary;
  },

  clear: () => set({ summary: null, loading: false }),
}));

export function selectPointsBalance(summary: PointsSummary | null): number {
  return summary?.message_points ?? DEFAULT_AVAILABLE_POINTS;
}

// Cross-domain subscriptions (module load time)
on<ChatMessageSentPayload>(CHAT_EVENTS.MESSAGE_SENT, ({ token }) => {
  void usePointsStore.getState().loadPoints(token);
});

on<AiMessageSentPayload>(AI_EVENTS.MESSAGE_SENT, ({ token }) => {
  void usePointsStore.getState().loadPoints(token);
});

on<MedicalPrescriptionScannedPayload>(MEDICAL_EVENTS.PRESCRIPTION_SCANNED, ({ token }) => {
  void usePointsStore.getState().loadPoints(token);
});

on<AuthLogoutPayload>(AUTH_EVENTS.LOGOUT, () => {
  usePointsStore.getState().clear();
});
