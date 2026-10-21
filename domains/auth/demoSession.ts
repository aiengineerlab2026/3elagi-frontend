import { Platform } from "react-native";
import type { DemoSlot } from "@/constants/demo";
import { isDemoSlot } from "@/constants/demo";

export const DEMO_SLOT_STORAGE_KEY = "3elagi-demo-slot";
const AUTH_KEY_PREFIX = "3elagi-auth";

/** sessionStorage keys that must not be shared across demo iframe panels. */
export function demoScopedStorageKey(base: string): string {
  const slot = readPersistedDemoSlot();
  return slot ? `${base}-demo-${slot}` : base;
}

/** Persist key for demo iframe panels — never writes to the main app session key. */
export function authPersistKeyForDemoSlot(slot: DemoSlot | null): string {
  return slot ? `${AUTH_KEY_PREFIX}-demo-${slot}` : AUTH_KEY_PREFIX;
}

export function readDemoSlotFromPathname(pathname: string): DemoSlot | null {
  const match = pathname.match(/^\/demo\/embed\/(mobile|laptop)\/?$/);
  const slot = match?.[1];
  return slot && isDemoSlot(slot) ? slot : null;
}

/** Which device chrome a panel shows; independent of which session (slot) it runs. */
export type DemoDevice = "phone" | "laptop";

export function isDemoDevice(value: string): value is DemoDevice {
  return value === "phone" || value === "laptop";
}

/**
 * Per-frame marker `<key>:<slot>[:<device>]`. `window.name` belongs to the individual
 * iframe and survives same-origin navigation; sessionStorage is shared by every frame in
 * the tab, so the two demo panels would clobber each other's slot (and each other's auth key).
 */
function readFrameMarker(): [DemoSlot | null, DemoDevice | null] {
  if (Platform.OS !== "web" || typeof window === "undefined") return [null, null];
  if (!window.name.startsWith(`${DEMO_SLOT_STORAGE_KEY}:`)) return [null, null];
  const [slot, device] = window.name
    .slice(DEMO_SLOT_STORAGE_KEY.length + 1)
    .split(":");
  return [
    slot && isDemoSlot(slot) ? slot : null,
    device && isDemoDevice(device) ? device : null,
  ];
}

export function readPersistedDemoSlot(): DemoSlot | null {
  return readFrameMarker()[0];
}

export function readPersistedDemoDevice(): DemoDevice | null {
  return readFrameMarker()[1];
}

export function persistDemoSlot(slot: DemoSlot): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  const device = readPersistedDemoDevice();
  window.name = demoFrameName(slot, device ?? undefined);
}

/** Iframe `name` attribute the demo shell sets, so the slot is known before any JS runs. */
export function demoFrameName(slot: DemoSlot, device?: DemoDevice): string {
  const marker = `${DEMO_SLOT_STORAGE_KEY}:${slot}`;
  return device ? `${marker}:${device}` : marker;
}

/** Resolved once per page load before auth store rehydrates. */
export function resolveInitialDemoSlot(): DemoSlot | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const fromPath = readDemoSlotFromPathname(window.location.pathname);
  if (fromPath) {
    persistDemoSlot(fromPath);
    return fromPath;
  }
  return readPersistedDemoSlot();
}

export function isDemoShellPath(pathname: string): boolean {
  return pathname === "/demo" || pathname.startsWith("/demo/");
}

export function isDemoEmbedPath(pathname: string): boolean {
  return /^\/demo\/embed\/(mobile|laptop)\/?$/.test(pathname);
}

/** Force mobile or desktop web chrome inside demo iframe panels. */
export function readDemoWebLayoutOverride(): "mobile" | "desktop" | null {
  if (Platform.OS !== "web") return null;
  const device = readPersistedDemoDevice();
  if (device) return device === "phone" ? "mobile" : "desktop";
  const slot = resolveInitialDemoSlot();
  if (slot === "mobile") return "mobile";
  if (slot === "laptop") return "desktop";
  return null;
}

/** Clears isolated auth storage for a demo iframe panel (web reload / reset). */
export function clearDemoSlotPersistedAuth(slot: DemoSlot): void {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(authPersistKeyForDemoSlot(slot));
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function stripDemoEmbedResetFromUrl(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("reset") !== "1") return false;
  params.delete("reset");
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.replaceState(null, "", next);
  return true;
}
