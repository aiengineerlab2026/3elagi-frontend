import React from "react";
import { Pressable, StyleSheet } from "react-native";
import {
  PaymentActionPanel,
  type PaymentReply,
} from "@/components/chat/PaymentActionPanel";
import type { Consultation } from "@/domains/consultations/api";
import { useColors } from "@/hooks/useColors";
import { useConsultationPaymentActions } from "@/hooks/useConsultationPaymentActions";
import {
  toConsultationPaymentMeta,
} from "@/components/consultations/consultationPaymentMeta";

type Props = {
  item: Consultation;
  isDoctor: boolean;
  paymentLink?: string | null;
  onUpdated?: () => void;
};

export function ConsultationListPaymentPanel({
  item,
  isDoctor,
  paymentLink,
  onUpdated,
}: Props) {
  const colors = useColors();
  const { busy, handlePaymentReply } = useConsultationPaymentActions(onUpdated);

  return (
    <Pressable
      onPress={(event) => event.stopPropagation?.()}
      style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.card }]}
    >
      <PaymentActionPanel
        meta={toConsultationPaymentMeta(item, paymentLink)}
        isDoctor={isDoctor}
        busy={busy}
        onReply={(reply: PaymentReply) => void handlePaymentReply(item.id, reply)}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 2,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
});
