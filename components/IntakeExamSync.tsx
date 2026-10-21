import { useEffect } from "react";
import { emit } from "@/utils/eventBus";
import {
  INTAKE_EXAM_EVENTS,
  type IntakeExamReminderPayload,
} from "@/domains/intake-exams/events";
import { getPresenceSocket, onIntakeExamReminder } from "@/domains/presence/socket";

export function IntakeExamSync() {
  useEffect(() => {
    const attach = () => {
      onIntakeExamReminder((payload) => {
        const notice: IntakeExamReminderPayload = {
          instanceId: payload.instanceId,
          examName: payload.examName,
          doctorName: payload.doctorName,
          deadlineAt: payload.deadlineAt,
          title: payload.title,
          body: payload.body,
        };
        emit(INTAKE_EXAM_EVENTS.REMINDER, notice);
      });
    };

    attach();
    const socket = getPresenceSocket();
    const onConnect = () => attach();
    socket?.on("connect", onConnect);
    return () => {
      socket?.off("connect", onConnect);
      onIntakeExamReminder(null);
    };
  }, []);

  return null;
}
