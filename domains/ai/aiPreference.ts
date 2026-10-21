import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AiPreferenceState {
  aiEnabled: boolean;
  setAiEnabled: (enabled: boolean) => void;
}

/**
 * Device-level switch for every AI feature: the assistant chatbot, reading
 * medical records with AI, and the doctor's "complete with AI" buttons.
 * Defaults on — AI was always available before this switch existed.
 */
export const useAiPreferenceStore = create<AiPreferenceState>()(
  persist(
    (set) => ({
      aiEnabled: true,
      setAiEnabled: (aiEnabled) => set({ aiEnabled }),
    }),
    {
      name: "3elagi-ai-enabled",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ aiEnabled: state.aiEnabled }),
    },
  ),
);

export function useAiEnabled(): boolean {
  return useAiPreferenceStore((s) => s.aiEnabled);
}

/** For callers outside React — route builders, handlers. */
export function isAiEnabled(): boolean {
  return useAiPreferenceStore.getState().aiEnabled;
}
