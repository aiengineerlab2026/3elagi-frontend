import React from "react";
import { Pressable, StyleSheet } from "react-native";
import {
  PaymentActionPanel,
  type PaymentReply,
} from "@/components/chat/PaymentActionPanel";
import type { UpcomingAppointment } from "@/domains/appointments/api";
import { useColors } from "@/hooks/useColors";
import { useAppointmentPaymentActions } from "@/hooks/useAppointmentPaymentActions";
import { toVideoAppointmentPaymentMeta } from "@/components/consultations/videoAppointmentPaymentMeta";

type Props = {
  item: UpcomingAppointment;
  isDoctor: boolean;
  onUpdated?: () => void;
};

export function VideoAppointmentPaymentPanel({
  item,
  isDoctor,
  onUpdated,
}: Props) {
  const colors = useColors();
  const peerId = item.other_user_id ?? "";
  const { busy, handlePaymentReply } = useAppointmentPaymentActions(
    peerId,
    onUpdated,
  );

  if (!peerId) return null;

  return (
    <Pressable
      onPress={(event) => event.stopPropagation?.()}
      style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.card }]}
    >
      <PaymentActionPanel
        meta={toVideoAppointmentPaymentMeta(item)}
        isDoctor={isDoctor}
        busy={busy}
        inactive={item.status === "cancelled" || item.status === "rejected"}
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
