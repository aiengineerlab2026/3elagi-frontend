import { useCallback, useState } from "react";
import type { PaymentReply } from "@/components/chat/PaymentActionPanel";
import {
  reviewConsultationPayment,
  submitConsultationPaymentProof,
} from "@/domains/consultations/api";
import { useAuthStore } from "@/domains/auth/store";
import { uploadFile } from "@/domains/medical/api";
import { useI18n } from "@/hooks/useI18n";
import { pickPaymentReceipt } from "@/utils/pickPaymentReceipt";
import { showErrorToast } from "@/utils/toast";

export function useConsultationPaymentActions(onSuccess?: () => void) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { t, isRTL } = useI18n();
  const [busy, setBusy] = useState(false);

  const handlePaymentReply = useCallback(
    async (consultationId: string, reply: PaymentReply) => {
      if (!accessToken || busy) return;

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
          await submitConsultationPaymentProof(
            consultationId,
            uploaded.url,
            accessToken,
          );
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
        await reviewConsultationPayment(
          consultationId,
          reply === "approve",
          accessToken,
        );
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
    [accessToken, busy, isRTL, onSuccess, t.common.error],
  );

  return { busy, handlePaymentReply };
}
