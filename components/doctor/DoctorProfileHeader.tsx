import { Star } from "lucide-react-native";
import React, { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { CircledCountryFlag } from "@/components/country/CircledCountryFlag";
import { surfaceCard, UI } from "@/constants/uiTokens";
import { patientCountryLabel, type MarketCountryCode } from "@/constants/patientCountries";
import { chatRepository } from "@/domains/chat/repository";
import type { PublicDoctorProfile } from "@/domains/doctor/api";
import { usePresenceStore } from "@/domains/presence/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { formatEgpPerUnit } from "@/utils/credits";
import { DoctorFeeLines } from "@/components/doctor/DoctorFeeLines";
import { flexRow } from "@/utils/rtl";

const HEADER_MIN_H = 196;
const PHOTO_SIZE = 96;
const PHOTO_SIZE_MOBILE = 80;

type Props = {
  doctor: PublicDoctorProfile;
  userId?: string;
  specialtyLabel: string;
  ratingAvg: number;
  ratingTotal: number;
  action?: React.ReactNode;
};

function availabilityLabel(
  online: boolean,
  onCall: boolean,
  immediateCallEnabled: boolean,
  t: ReturnType<typeof useI18n>["t"],
): string {
  if (!online) return t.home.offline;
  if (immediateCallEnabled) {
    return onCall ? t.auth.doctorOnCall : t.auth.doctorAvailableNow;
  }
  return t.home.online;
}

function availabilityColor(
  online: boolean,
  onCall: boolean,
  immediateCallEnabled: boolean,
  colors: ReturnType<typeof useColors>,
): string {
  if (!online) return colors.mutedForeground;
  if (immediateCallEnabled) return onCall ? "#ef4444" : colors.success;
  return colors.success;
}

/** Premium profile hero — cohesive identity block + CTA column. */
export function DoctorProfileHeader({
  doctor,
  userId,
  specialtyLabel,
  ratingAvg,
  ratingTotal,
  action,
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isMobile } = useWebLayout();
  const dir = flexRow(isRTL);
  const textAlign = isRTL ? "right" : "left";
  const photoSize = isMobile ? PHOTO_SIZE_MOBILE : PHOTO_SIZE;
  const [hovered, setHovered] = useState(false);
  const chatUserId = userId ?? doctor.userId;
  const cached = chatRepository.getUser(chatUserId);
  const country = cached?.country?.trim().toUpperCase() ?? "";
  const hasCountry = /^[A-Z]{2}$/.test(country);
  const isOnline = usePresenceStore((s) => s.isOnline(chatUserId));
  const liveBusy = usePresenceStore((s) => s.busyDoctors[chatUserId]);
  const onCall = liveBusy ?? !!cached?.onCall;
  const immediate = !!cached?.immediateCallEnabled;
  const hasRating = ratingAvg > 0;
  const availColor = availabilityColor(isOnline, onCall, immediate, colors);
  const availLabel = availabilityLabel(isOnline, onCall, immediate, t);

  const identityBlock = (
    <View style={[styles.identity, { flexDirection: dir }]}>
      <Avatar
        uri={doctor.photoUrl}
        seed={chatUserId}
        role="doctor"
        size={photoSize}
        presence={isOnline ? "online" : "offline"}
      />

      <View style={styles.main}>
        <Text
          style={[
            styles.name,
            isMobile && styles.nameMobile,
            { color: colors.foreground, textAlign },
          ]}
          numberOfLines={2}
        >
          {doctor.name}
        </Text>

        {specialtyLabel ? (
          <Text
            style={[styles.specialty, { color: colors.mutedForeground, textAlign }]}
            numberOfLines={2}
          >
            {specialtyLabel}
          </Text>
        ) : null}

        <View style={[styles.ratingRow, { flexDirection: dir }]}>
          <Star
            size={13}
            color={colors.warning}
            fill={hasRating ? colors.warning : "transparent"}
          />
          <Text style={[styles.ratingValue, { color: colors.foreground }]}>
            {hasRating ? ratingAvg.toFixed(1) : t.doctor.new}
          </Text>
          {hasRating && ratingTotal > 0 ? (
            <Text style={[styles.reviewCount, { color: colors.mutedForeground }]}>
              · {ratingTotal} {t.doctor.reviews}
            </Text>
          ) : null}
        </View>

        <View style={[styles.statusRow, { flexDirection: dir }]}>
          {hasCountry ? (
            <View style={[styles.statusChip, { flexDirection: dir, backgroundColor: colors.background }]}>
              <CircledCountryFlag country={country as MarketCountryCode} size={15} />
              <Text style={[styles.statusText, { color: colors.foreground }]} numberOfLines={1}>
                {patientCountryLabel(country as MarketCountryCode, isRTL)}
              </Text>
            </View>
          ) : null}
          <View
            style={[
              styles.statusChip,
              { flexDirection: dir, backgroundColor: `${availColor}12` },
            ]}
          >
            <View style={[styles.availDot, { backgroundColor: availColor }]} />
            <Text style={[styles.statusText, { color: availColor }]} numberOfLines={1}>
              {availLabel}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const actionsBlock = (
    <View
      style={[
        isMobile ? styles.actionsMobile : styles.actions,
        !isMobile && { alignItems: isRTL ? "flex-start" : "flex-end" },
      ]}
    >
      <DoctorFeeLines
        doctor={{
          country: doctor.country,
          textPriceLocal: doctor.textPriceLocal,
          textPriceUsd: doctor.textPriceUsd,
          videoPriceLocal: doctor.videoPriceLocal,
          videoPriceUsd: doctor.videoPriceUsd,
        }}
        isRTL={isRTL}
        align={isMobile ? "start" : "end"}
        fallback={formatEgpPerUnit(doctor.consultationPrice, t)}
      />
      {action ? <View style={styles.actionSlot}>{action}</View> : null}
    </View>
  );

  return (
    <View
      style={[
        styles.card,
        isMobile && styles.cardMobile,
        surfaceCard(colors.card, colors.border),
        Platform.OS === "web" && hovered ? UI.shadowHover : null,
      ]}
      // @ts-expect-error RN Web hover
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isMobile ? (
        <>
          <View style={[styles.rowMobile, { flexDirection: dir }]}>{identityBlock}</View>
          {actionsBlock}
        </>
      ) : (
        <View style={[styles.row, { flexDirection: dir }]}>
          {identityBlock}
          {actionsBlock}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    minHeight: HEADER_MIN_H,
    justifyContent: "center",
  },
  cardMobile: {
    minHeight: undefined,
  },
  row: {
    alignItems: "stretch",
    paddingHorizontal: UI.space.md,
    paddingVertical: UI.space.md,
    gap: UI.space.md,
    minHeight: HEADER_MIN_H,
  },
  rowMobile: {
    paddingHorizontal: UI.space.md,
    paddingTop: UI.space.md,
    paddingBottom: UI.space.sm,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: UI.space.md,
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 5,
    justifyContent: "center",
  },
  name: {
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.35,
    lineHeight: 27,
  },
  nameMobile: {
    fontSize: 19,
    lineHeight: 25,
  },
  specialty: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 19,
  },
  ratingRow: {
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
  },
  reviewCount: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
  },
  statusRow: {
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  statusChip: {
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: UI.radius.chip,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actions: {
    gap: UI.space.sm,
    flexShrink: 0,
    justifyContent: "center",
    minWidth: 148,
    paddingVertical: 4,
    paddingLeft: UI.space.sm,
  },
  actionsMobile: {
    gap: UI.space.sm,
    paddingHorizontal: UI.space.md,
    paddingBottom: UI.space.md,
    width: "100%",
  },
  actionSlot: {
    alignSelf: "stretch",
  },
});
