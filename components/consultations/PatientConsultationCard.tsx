import { router } from "expo-router";
import { ChevronLeft, ChevronRight, MessageCircle, Trash2 } from "lucide-react-native";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { ConsultationListPaymentPanel } from "@/components/consultations/ConsultationListPaymentPanel";
import {
  consultationNeedsPaymentPanel,
  consultationPaymentBadge,
} from "@/components/consultations/consultationPaymentMeta";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { countryFlagEmoji } from "@/constants/patientCountries";
import { surfaceCard, UI } from "@/constants/uiTokens";
import type { PatientConsultation } from "@/domains/consultations/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useRemoveConsultation } from "@/hooks/useRemoveConsultation";
import { formatEgp } from "@/utils/credits";
import { flexRow } from "@/utils/rtl";

type Props = {
  item: PatientConsultation;
  locale: string;
  onRemoved?: () => void;
  onPaymentUpdated?: () => void;
};

function statusMeta(
  item: PatientConsultation,
  t: ReturnType<typeof useI18n>["t"],
  colors: ReturnType<typeof useColors>,
) {
  const paymentBadge = consultationPaymentBadge(item, false, t, colors);
  if (paymentBadge) return paymentBadge;

  switch (item.status) {
    case "open":
      return { label: t.consultations.open, color: colors.primary, prominent: true, muted: false };
    case "pending":
      return { label: t.consultations.waitingActive, color: "#0d9488", prominent: true, muted: false };
    case "ended":
      return { label: t.consultations.completed, color: colors.mutedForeground, prominent: false, muted: false };
    case "cancelled":
    case "rejected":
      return { label: t.consultations.cancelled, color: colors.mutedForeground, prominent: false, muted: true };
    default:
      return { label: item.status, color: colors.mutedForeground, prominent: false, muted: false };
  }
}

export function PatientConsultationCard({
  item,
  locale,
  onRemoved,
  onPaymentUpdated,
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { remove } = useRemoveConsultation();
  const dir = flexRow(isRTL);
  const textAlign = isRTL ? "right" : "left";
  const [hovered, setHovered] = useState(false);
  const meta = statusMeta(item, t, colors);
  const showPayment = consultationNeedsPaymentPanel(item);
  const Chevron = isRTL ? ChevronLeft : ChevronRight;
  const isCancelled = item.status === "cancelled" || item.status === "rejected";

  const created = new Date(item.created_at);
  const dateLabel = created.toLocaleDateString(locale === "ar" ? "ar-EG" : locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeLabel = created.toLocaleTimeString(locale === "ar" ? "ar-EG" : locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const openChat = () => {
    router.push({
      pathname: "/chat/[id]",
      params: { id: item.doctor_id, consultationId: item.id },
    });
  };

  return (
    <View
      style={[
        styles.card,
        surfaceCard(colors.card, colors.border),
        meta.prominent && !isCancelled
          ? { borderColor: `${meta.color}33` }
          : null,
        { opacity: isCancelled ? 0.58 : 1 },
      ]}
    >
      <Pressable
        onPress={openChat}
        accessibilityRole="button"
        // @ts-expect-error RN Web hover
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={({ pressed }) => [
          styles.cardRow,
          {
            flexDirection: dir,
            opacity: pressed ? 0.94 : 1,
          },
          Platform.OS === "web" && hovered ? UI.shadowHover : null,
        ]}
      >
      <Avatar uri={null} seed={item.doctor_id} role="doctor" size={44} />

      <View style={styles.main}>
        <View style={[styles.topRow, { flexDirection: dir }]}>
          <Text style={[styles.name, { color: colors.foreground, textAlign }]} numberOfLines={1}>
            {/* Country the consultation was requested from. */}
            {item.patient_country ? `${countryFlagEmoji(item.patient_country)} ` : ""}
            {item.doctor_name}
          </Text>
          <StatusBadge label={meta.label} color={meta.color} muted={meta.muted} />
        </View>

        {item.description?.trim() ? (
          <Text
            style={[styles.subject, { color: colors.mutedForeground, textAlign }]}
            numberOfLines={1}
          >
            {item.description.trim()}
          </Text>
        ) : null}

        <View style={[styles.metaRow, { flexDirection: dir }]}>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {dateLabel} · {timeLabel}
          </Text>
          <Text style={[styles.meta, { color: colors.foreground, fontWeight: "700" }]}>
            {formatEgp(item.reserved_points, t)} {t.consultations.reserved}
          </Text>
        </View>
      </View>

      <View style={[styles.action, { flexDirection: dir }]}>
        {!isCancelled ? (
          <View style={[styles.openChip, { backgroundColor: `${colors.primary}10` }]}>
            <MessageCircle size={14} color={colors.primary} />
          </View>
        ) : null}
        <Pressable
          accessibilityLabel={t.consultations.removeConsultation}
          onPress={(event) => {
            event.stopPropagation?.();
            remove(item.id, item.doctor_id, onRemoved);
          }}
          hitSlop={8}
          style={({ pressed }) => [
            styles.removeBtn,
            {
              borderColor: colors.border,
              backgroundColor: pressed ? `${colors.destructive}14` : colors.card,
            },
          ]}
        >
          <Trash2 size={14} color={colors.destructive} />
        </Pressable>
        <Chevron size={16} color={colors.mutedForeground} />
      </View>
      </Pressable>

      {showPayment ? (
        <ConsultationListPaymentPanel
          item={item}
          isDoctor={false}
          paymentLink={item.payment_link}
          onUpdated={onPaymentUpdated}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: UI.space.sm,
    padding: UI.space.sm + 4,
  },
  cardRow: {
    alignItems: "center",
    gap: UI.space.sm,
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  topRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: UI.space.sm,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  subject: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  metaRow: {
    alignItems: "center",
    flexWrap: "wrap",
    gap: UI.space.sm,
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  action: {
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  openChip: {
    width: 28,
    height: 28,
    borderRadius: UI.radius.icon,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: UI.radius.icon,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
