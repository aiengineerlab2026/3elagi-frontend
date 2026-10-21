import { NativeModules, Platform } from "react-native";

type IncomingCallNativePayload = {
  sessionId: string;
  callerId?: string;
  callerName?: string;
  title?: string;
  body?: string;
};

type IncomingCallModuleShape = {
  startRinging(payload: IncomingCallNativePayload): Promise<boolean>;
  stopRinging(sessionId: string | null): Promise<void>;
  consumeLaunchIntent(): Promise<IncomingCallLaunchIntent | null>;
};

export type IncomingCallLaunchIntent = {
  sessionId: string;
  callerId?: string;
  callerName?: string;
  acceptCall?: boolean;
  declineCall?: boolean;
};

const NativeIncomingCall = NativeModules.IncomingCallModule as
  | IncomingCallModuleShape
  | undefined;

/** Android-only native ringing (foreground service + looped bundled ringtone). */
export function isAndroidNativeIncomingCallAvailable(): boolean {
  return Platform.OS === "android" && !!NativeIncomingCall?.startRinging;
}

export async function startAndroidIncomingCallRing(
  payload: IncomingCallNativePayload,
): Promise<void> {
  if (!isAndroidNativeIncomingCallAvailable()) return;
  try {
    await NativeIncomingCall!.startRinging(payload);
  } catch {
    // Native ring failing must never break the call flow.
  }
}

export async function stopAndroidIncomingCallRing(sessionId?: string): Promise<void> {
  if (!isAndroidNativeIncomingCallAvailable()) return;
  try {
    await NativeIncomingCall!.stopRinging(sessionId ?? null);
  } catch {
    // ignore
  }
}

export async function consumeAndroidIncomingCallLaunchIntent(): Promise<IncomingCallLaunchIntent | null> {
  if (!NativeIncomingCall?.consumeLaunchIntent) return null;
  try {
    return (await NativeIncomingCall.consumeLaunchIntent()) ?? null;
  } catch {
    return null;
  }
}
