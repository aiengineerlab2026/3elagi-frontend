import { router } from "expo-router";
import { navigateBack } from "@/utils/appNavigation";

/**
 * Leave a chat thread. Pops real push history first, so back lands wherever the
 * thread was opened from. `origin` only matters when there is no history to pop
 * (opened from a push notification or a deep link): "doctors" returns to the
 * doctor browse, anything else to the chat history list.
 */
export function leaveChatToHistory(origin?: string | null): void {
  const fallback = origin === "doctors" ? "/(tabs)" : "/(tabs)/history";
  navigateBack(router, fallback);
}
