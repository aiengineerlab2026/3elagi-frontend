import type { VideoCallSession } from "@/domains/video-call/api";

type ResolveMeetingChatPeerInput = {
  isDoctor: boolean;
  session: VideoCallSession | null;
  peerUserIdParam?: string;
  /** Legacy appointment join param (doctor's patient id). */
  patientUserIdParam?: string;
};

/** Counterpart user id for the in-meeting chat thread. */
export function resolveMeetingChatPeerId({
  isDoctor,
  session,
  peerUserIdParam,
  patientUserIdParam,
}: ResolveMeetingChatPeerInput): string {
  const peerFromParams = peerUserIdParam?.trim();
  if (peerFromParams) return peerFromParams;

  if (session?.id && session.id !== "direct") {
    return isDoctor
      ? session.patientUserId?.trim() || ""
      : session.doctorUserId?.trim() || "";
  }

  if (isDoctor && patientUserIdParam?.trim()) {
    return patientUserIdParam.trim();
  }

  return isDoctor
    ? session?.patientUserId?.trim() || ""
    : session?.doctorUserId?.trim() || "";
}

export function buildDirectMeetingSession(input: {
  meetingUrl: string;
  durationMinutes: number;
  isDoctor: boolean;
  selfUserId: string;
  selfName?: string;
  peerUserId?: string;
  peerName?: string;
  patientUserIdParam?: string;
}): VideoCallSession {
  const peerId =
    input.peerUserId?.trim() ||
    (input.isDoctor ? input.patientUserIdParam?.trim() : undefined) ||
    "";
  const selfName = input.selfName?.trim() ?? "";
  const peerName = input.peerName?.trim() ?? "";

  return {
    id: "direct",
    status: "accepted",
    roomUrl: input.meetingUrl,
    patientUserId: input.isDoctor ? peerId : input.selfUserId,
    doctorUserId: input.isDoctor ? input.selfUserId : peerId,
    patientName: input.isDoctor ? peerName : selfName,
    doctorName: input.isDoctor ? selfName : peerName,
    durationMinutes: input.durationMinutes,
  };
}
