import { Platform } from "react-native";
import {
  startAndroidIncomingCallRing,
  stopAndroidIncomingCallRing,
} from "@/domains/video-call/androidIncomingCall";

type StartPayload = {
  sessionId: string;
  callerId?: string;
  callerName?: string;
};

/** Starts native Android ringing when available; no-op on other platforms. */
export function startIncomingCallRing(payload: StartPayload): void {
  if (Platform.OS !== "android") return;
  void startAndroidIncomingCallRing({
    sessionId: payload.sessionId,
    callerId: payload.callerId,
    callerName: payload.callerName,
    title: "Incoming video call",
    body: payload.callerName
      ? `${payload.callerName} is calling`
      : "Incoming call",
  });
}

/** Stops native Android ringing and clears call UI for the session. */
export function stopIncomingCallRing(sessionId?: string): void {
  if (Platform.OS !== "android") return;
  void stopAndroidIncomingCallRing(sessionId);
}
