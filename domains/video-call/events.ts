export const VIDEO_CALL_EVENTS = {
  /** A call push landed while the app was open — the socket may be down. */
  INCOMING_PUSH: "video-call:incoming_push",
} as const;

export interface IncomingVideoCallPushPayload {
  sessionId: string;
  callerId?: string;
  callerName?: string;
}
