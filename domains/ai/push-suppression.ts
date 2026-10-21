import { AppState } from "react-native";

let assistantScreenActive = false;
let activeAiChatId: string | null = null;
let aiWidgetOpen = false;
let activeAiWidgetChatId: string | null = null;

export function setAssistantScreenActive(active: boolean): void {
  assistantScreenActive = active;
  if (!active) activeAiChatId = null;
}

export function setActiveAiChatId(chatId: string | null): void {
  activeAiChatId = chatId;
}

export function setAiWidgetOpen(open: boolean): void {
  aiWidgetOpen = open;
  if (!open) activeAiWidgetChatId = null;
}

export function setActiveAiWidgetChatId(chatId: string | null): void {
  activeAiWidgetChatId = chatId?.trim() || null;
}

/** AI assistant push notifications are disabled on mobile. */
export function isMobileAiPushDisabled(): boolean {
  return true;
}

/** Suppress AI push in foreground when the user is already on that conversation. */
export function shouldSuppressAiPush(chatId: string): boolean {
  if (isMobileAiPushDisabled()) return true;
  if (!chatId || AppState.currentState !== "active") return false;
  if (assistantScreenActive && activeAiChatId === chatId) return true;
  if (aiWidgetOpen && activeAiWidgetChatId === chatId) return true;
  return false;
}

export function isAssistantScreenActive(): boolean {
  return assistantScreenActive;
}
