import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "3elagi-pending-auth-return";

let memory: string | null = null;
let hydrated = false;

/** Paths guests may resume after login/signup (chat / doctor profile / AI). */
export function isPendingAuthReturnHref(href: string): boolean {
  const path = href.trim();
  if (!path.startsWith("/")) return false;
  return (
    path.startsWith("/chat/") ||
    path.startsWith("/doctor/") ||
    path.startsWith("/ai/")
  );
}

export function setPendingAuthReturn(href: string | null | undefined): void {
  const next = href?.trim() ?? "";
  if (!next || !isPendingAuthReturnHref(next)) {
    memory = null;
    void AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  memory = next;
  void AsyncStorage.setItem(STORAGE_KEY, next);
}

export function peekPendingAuthReturn(): string | null {
  return memory;
}

/** Read + clear the pending return path (sync memory; storage cleared async). */
export function consumePendingAuthReturn(): string | null {
  const next = memory;
  memory = null;
  void AsyncStorage.removeItem(STORAGE_KEY);
  return next;
}

export function clearPendingAuthReturn(): void {
  memory = null;
  void AsyncStorage.removeItem(STORAGE_KEY);
}

/** Load persisted return path once (survive verify-email / app reload). */
export async function hydratePendingAuthReturn(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && isPendingAuthReturnHref(stored)) {
      memory = stored;
    }
  } catch {
    // ignore storage failures
  }
}
