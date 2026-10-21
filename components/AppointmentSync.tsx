import { useEffect } from "react";
import { emit } from "@/utils/eventBus";
import {
  APPOINTMENT_EVENTS,
  type AppointmentReminderPayload,
  type AppointmentUpdatedPayload,
} from "@/domains/appointments/events";
import { useAuthStore } from "@/domains/auth/store";
import { useChatStore } from "@/domains/chat/store";
import {
  getPresenceSocket,
  onAppointmentReminder,
  onAppointmentUpdated,
} from "@/domains/presence/socket";

export function AppointmentSync() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const selfId = useAuthStore((s) => s.profile?.id ?? null);
  const activeChatPeerId = useChatStore((s) => s.activeChatPeerId);
  const loadMessages = useChatStore((s) => s.loadMessages);

  useEffect(() => {
    const attach = () => {
      onAppointmentReminder((payload) => {
        const notice: AppointmentReminderPayload = {
          appointmentId: payload.appointment_id,
          sessionId: payload.session_id,
          meetingLink: payload.meeting_link,
          when: payload.when,
          otherParticipantName: payload.other_participant_name,
        };
        emit(APPOINTMENT_EVENTS.REMINDER, notice);
      });

      onAppointmentUpdated((payload) => {
        const updated: AppointmentUpdatedPayload = {
          appointmentId: payload.appointment_id,
          peerId: payload.peer_id,
          actorId: payload.actor_id,
          actorName: payload.actor_name,
          action: payload.action,
          date: payload.date,
          time: payload.time,
          status: payload.status,
        };
        emit(APPOINTMENT_EVENTS.UPDATED, updated);

        if (!accessToken || !selfId || !payload.peer_id) return;
        if (activeChatPeerId && activeChatPeerId === payload.peer_id) {
          void loadMessages(payload.peer_id, accessToken, selfId);
        }
      });
    };

    attach();
    const socket = getPresenceSocket();
    const onConnect = () => attach();
    socket?.on("connect", onConnect);
    return () => {
      socket?.off("connect", onConnect);
      onAppointmentReminder(null);
      onAppointmentUpdated(null);
    };
  }, [accessToken, selfId, activeChatPeerId, loadMessages]);

  return null;
}
