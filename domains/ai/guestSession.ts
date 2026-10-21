import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AiConversation } from "@/domains/ai/types";

const GUEST_ID_KEY = "3elagi-ai-guest-id";
const GUEST_COUNT_KEY = "3elagi-ai-guest-sent-count";
const GUEST_CONVERSATIONS_KEY = "3elagi-ai-guest-conversations";
const GUEST_ACTIVE_CONVERSATION_KEY = "3elagi-ai-guest-active-id";

/** Max user messages before asking guests to log in / sign up. */
export const GUEST_AI_MAX_MESSAGES = 3;

export const GUEST_WIDGET_CONVERSATION_PREFIX = "guest-widget-";

function makeGuestId(): string {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function makeGuestConversationId(): string {
  return `${GUEST_WIDGET_CONVERSATION_PREFIX}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

let memoryGuestId: string | null = null;
let memorySentCount: number | null = null;

export async function getGuestAiSessionId(): Promise<string> {
  if (memoryGuestId) return memoryGuestId;
  try {
    const stored = await AsyncStorage.getItem(GUEST_ID_KEY);
    if (stored && stored.length >= 8) {
      memoryGuestId = stored;
      return stored;
    }
  } catch {
    // ignore
  }
  const next = makeGuestId();
  memoryGuestId = next;
  void AsyncStorage.setItem(GUEST_ID_KEY, next);
  return next;
}

export async function getGuestAiSentCount(): Promise<number> {
  if (memorySentCount != null) return memorySentCount;
  try {
    const raw = await AsyncStorage.getItem(GUEST_COUNT_KEY);
    const n = raw ? Number(raw) : 0;
    memorySentCount = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    memorySentCount = 0;
  }
  return memorySentCount;
}

export async function setGuestAiSentCount(count: number): Promise<void> {
  const next = Math.max(0, Math.floor(count));
  memorySentCount = next;
  void AsyncStorage.setItem(GUEST_COUNT_KEY, String(next));
}

export async function clearGuestAiSentCount(): Promise<void> {
  memorySentCount = 0;
  void AsyncStorage.removeItem(GUEST_COUNT_KEY);
}

export async function loadGuestConversations(): Promise<AiConversation[]> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AiConversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveGuestConversations(
  conversations: AiConversation[],
): Promise<void> {
  void AsyncStorage.setItem(GUEST_CONVERSATIONS_KEY, JSON.stringify(conversations));
}

export async function loadGuestActiveConversationId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(GUEST_ACTIVE_CONVERSATION_KEY);
  } catch {
    return null;
  }
}

export async function saveGuestActiveConversationId(id: string | null): Promise<void> {
  if (!id) {
    void AsyncStorage.removeItem(GUEST_ACTIVE_CONVERSATION_KEY);
    return;
  }
  void AsyncStorage.setItem(GUEST_ACTIVE_CONVERSATION_KEY, id);
}
