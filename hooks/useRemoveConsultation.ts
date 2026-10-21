import { removeConsultation } from "@/domains/consultations/api";
import { useAuthStore } from "@/domains/auth/store";
import { useChatStore } from "@/domains/chat/store";
import { useI18n } from "@/hooks/useI18n";
import { confirmDestructiveAction } from "@/utils/confirmDestructiveAction";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

export function useRemoveConsultation() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const selfId = useChatStore((s) => s.selfId);
  const handleConsultationRemoved = useChatStore((s) => s.handleConsultationRemoved);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const { t } = useI18n();

  const remove = (consultationId: string, peerId: string, onDone?: () => void) => {
    if (!accessToken || !selfId) return;

    confirmDestructiveAction({
      title: t.consultations.removeConsultation,
      message: t.consultations.removeConsultationConfirm,
      confirmLabel: t.common.delete,
      cancelLabel: t.common.cancel,
      onConfirm: async () => {
        try {
          const result = await removeConsultation(consultationId, accessToken);
          handleConsultationRemoved(
            {
              consultation_id: result.consultation_id,
              peer_id: peerId,
              message_ids: result.deleted_message_ids,
            },
            accessToken,
            selfId,
            role,
          );
          await loadConversations(accessToken, selfId, role);
          showSuccessToast(t.consultations.removeConsultationSuccess);
          onDone?.();
        } catch (e) {
          showErrorToast(
            t.consultations.removeConsultationFailed,
            (e as Error).message,
          );
        }
      },
    });
  };

  return { remove };
}
