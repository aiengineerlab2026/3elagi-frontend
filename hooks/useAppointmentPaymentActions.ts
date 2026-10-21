import { useCallback, useState } from "react";
import type { PaymentReply } from "@/components/chat/PaymentActionPanel";
import { sendAppointmentAction } from "@/domains/appointments/api";
import { useAuthStore } from "@/domains/auth/store";
import { uploadFile } from "@/domains/medical/api";
import { useI18n } from "@/hooks/useI18n";
import { pickPaymentReceipt } from "@/utils/pickPaymentReceipt";
import { showErrorToast } from "@/utils/toast";

export function useAppointmentPaymentActions(
  peerUserId: string,
  onSuccess?: () => void,
) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { t, isRTL } = useI18n();
  const [busy, setBusy] = useState(false);

  const handlePaymentReply = useCallback(
    async (appointmentId: string, reply: PaymentReply) => {
      if (!accessToken || !peerUserId || busy) return;

      if (reply === "submit") {
        const asset = await pickPaymentReceipt();
        if (!asset) return;
        setBusy(true);
        try {
          const uploaded = await uploadFile(
            asset.uri,
            asset.mimeType ?? "image/jpeg",
            asset.name || `receipt-${Date.now()}`,
            accessToken,
            asset.file,
          );
          await sendAppointmentAction(accessToken, peerUserId, {
            appointment_id: appointmentId,
            action: "payment_submitted",
            date: "",
            time: "",
            payment_proof_url: uploaded.url,
          });
          onSuccess?.();
        } catch (e) {
          showErrorToast(
            t.common.error,
            e instanceof Error
              ? e.message
              : isRTL
                ? "تعذر تحديث الدفع"
                : "Could not update the payment",
          );
        } finally {
          setBusy(false);
        }
        return;
      }

      setBusy(true);
      try {
        await sendAppointmentAction(accessToken, peerUserId, {
          appointment_id: appointmentId,
          action: reply === "approve" ? "payment_approved" : "payment_rejected",
          date: "",
          time: "",
        });
        onSuccess?.();
      } catch (e) {
        showErrorToast(
          t.common.error,
          e instanceof Error
            ? e.message
            : isRTL
              ? "تعذر تحديث الدفع"
              : "Could not update the payment",
        );
      } finally {
        setBusy(false);
      }
    },
    [accessToken, busy, isRTL, onSuccess, peerUserId, t.common.error],
  );

  return { busy, handlePaymentReply };
}
