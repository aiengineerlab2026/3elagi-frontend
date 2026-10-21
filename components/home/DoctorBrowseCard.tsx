import { MessageCircle, Star, Video } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Avatar } from "@/components/Avatar";
import { CircledCountryFlag } from "@/components/country/CircledCountryFlag";
import { cardShellSoft, primaryButton, UI } from "@/constants/uiTokens";
import { patientCountryLabel, type MarketCountryCode } from "@/constants/patientCountries";
import type { Conversation } from "@/domains/chat/types";
import { doctorTagRowStyle, doctorTagTextStyle } from "@/domains/doctor/tagDisplay";
import { usePresenceStore } from "@/domains/presence/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { formatEgpPerUnit } from "@/utils/credits";
import { DoctorFeeLines } from "@/components/doctor/DoctorFeeLines";
import { IMMEDIATE_VIDEO_CALL_ENABLED } from "@/constants/features";
import { flexRow } from "@/utils/rtl";

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

interface Props {
  item: Conversation;
  isRTL: boolean;
  tagDisplayMap?: Record<string, string>;
  onViewProfile: () => void;
  onStartConsultation: () => void;
}

export function DoctorBrowseCard({
  item,
  isRTL,
  tagDisplayMap,
  onViewProfile,
  onStartConsultation,
}: Props) {
  const colors = useColors();
  const { t, locale } = useI18n();
  const dir = flexRow(isRTL);
  const { width } = useWindowDimensions();
  // Side-by-side leaves ~100px for the name once the 148px CTA claims its
  // space, so narrow screens put the actions on their own row underneath.
  const stacked = width < 480;
  const textAlign = isRTL ? "right" : "left";
  const [hovered, setHovered] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);
  const isOnline = usePresenceStore((s) => s.isOnline(item.user.id));
  const liveBusy = usePresenceStore((s) => s.busyDoctors[item.user.id]);
  const onCall = liveBusy ?? !!item.user.onCall;
  const hasRating = item.user.rating != null && item.user.rating > 0;
  const price = item.user.consultationPrice ?? 1;
  const country = item.user.country?.trim().toUpperCase() ?? "";
  const hasCountry = /^[A-Z]{2}$/.test(country);
  const canCallNow = IMMEDIATE_VIDEO_CALL_ENABLED && !!item.user.immediateCallEnabled;
  const availColor = availabilityColor(isOnline, onCall, canCallNow, colors);
  const availLabel = availabilityLabel(isOnline, onCall, canCallNow, t);
  const tagItems = useMemo(() => {
    const tags = item.user.tags ?? [];
    return tags
      .map((canonical) => canonical.trim())
      .filter(Boolean)
      .map((canonical) => ({
        canonical,
        display: tagDisplayMap?.[canonical] ?? canonical,
      }));
  }, [item.user.tags, tagDisplayMap]);
  const chipRowStyle = doctorTagRowStyle(isRTL);

  return (
    <View
      style={[
        styles.card,
        cardShellSoft(colors.card, colors.border),
        Platform.OS === "web" && hovered ? UI.shadowHover : null,
      ]}
      // @ts-expect-error RN Web hover
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setCtaHovered(false);
      }}
    >
      <View style={[styles.row, stacked ? styles.rowStacked : { flexDirection: dir }]}>
        <Pressable
          onPress={onViewProfile}
          accessibilityRole="button"
          accessibilityLabel={`${item.user.name}, ${item.user.specialty ?? ""}`}
          style={({ pressed }) => [
            styles.info,
            { flexDirection: dir, opacity: pressed ? 0.94 : 1 },
          ]}
        >
          <Avatar
            uri={item.user.photoUrl}
            seed={item.user.id}
            role="doctor"
            size={52}
            presence={isOnline ? "online" : "offline"}
          />
          <View style={styles.main}>
            <Text
              style={[styles.name, { color: colors.foreground, textAlign }]}
              numberOfLines={stacked ? 2 : 1}
            >
              {item.user.name}
            </Text>
            {item.user.specialty ? (
              <Text
                style={[styles.specialty, { color: colors.mutedForeground, textAlign }]}
                numberOfLines={1}
              >
                {item.user.specialty}
              </Text>
            ) : null}
            <View style={[styles.metaRow, { flexDirection: dir }]}>
              <View style={[styles.metaGroup, { flexDirection: dir }]}>
                <Star
                  size={12}
                  color={colors.warning}
                  fill={hasRating ? colors.warning : "transparent"}
                />
                <Text style={[styles.metaStrong, { color: colors.foreground }]}>
                  {hasRating ? item.user.rating!.toFixed(1) : t.doctor.new}
                </Text>
                {hasRating && item.user.ratingTotal != null && item.user.ratingTotal > 0 ? (
                  <Text style={[styles.metaMuted, { color: colors.mutedForeground }]}>
                    ({item.user.ratingTotal})
                  </Text>
                ) : null}
              </View>

              {hasCountry ? (
                <>
                  <Text style={[styles.sep, { color: colors.mutedForeground }]}>·</Text>
                  <View style={[styles.metaGroup, { flexDirection: dir }]}>
                    <CircledCountryFlag country={country as MarketCountryCode} size={14} />
                    <Text
                      style={[styles.metaMuted, { color: colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {patientCountryLabel(country as MarketCountryCode, isRTL)}
                    </Text>
                  </View>
                </>
              ) : null}

              <Text style={[styles.sep, { color: colors.mutedForeground }]}>·</Text>
              <View style={[styles.metaGroup, { flexDirection: dir }]}>
                <View style={[styles.availDot, { backgroundColor: availColor }]} />
                <Text style={[styles.metaMuted, { color: availColor }]} numberOfLines={1}>
                  {availLabel}
                </Text>
              </View>
            </View>

            {tagItems.length > 0 ? (
              <View style={[styles.tagChips, chipRowStyle, { flexDirection: dir }]}>
                {tagItems.map(({ canonical, display }) => (
                  <View
                    key={canonical}
                    style={[
                      styles.tagChip,
                      {
                        backgroundColor: `${colors.primary}14`,
                        borderColor: `${colors.primary}55`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        { color: colors.primary },
                        doctorTagTextStyle(display, locale),
                      ]}
                      numberOfLines={1}
                    >
                      {display}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.feePillSpacing}>
              <DoctorFeeLines
                doctor={{
                  country: item.user.country,
                  textPriceLocal: item.user.textPriceLocal,
                  textPriceUsd: item.user.textPriceUsd,
                  videoPriceLocal: item.user.videoPriceLocal,
                  videoPriceUsd: item.user.videoPriceUsd,
                }}
                isRTL={isRTL}
                fallback={formatEgpPerUnit(price, t)}
              />
            </View>
          </View>
        </Pressable>

        <View
          style={[
            styles.actions,
            stacked
              ? [styles.actionsStacked, { flexDirection: dir }]
              : { alignItems: isRTL ? "flex-start" : "flex-end" },
          ]}
        >
          <Pressable
            onPress={onStartConsultation}
            accessibilityRole="button"
            accessibilityLabel={t.home.startConsultation}
            // @ts-expect-error RN Web hover
            onMouseEnter={() => setCtaHovered(true)}
            onMouseLeave={() => setCtaHovered(false)}
            style={({ pressed }) => [
              styles.cta,
              primaryButton(),
              {
                backgroundColor:
                  ctaHovered && Platform.OS === "web"
                    ? colors.accentForeground
                    : colors.primary,
                opacity: pressed ? 0.92 : 1,
                flexDirection: dir,
              },
            ]}
          >
            {canCallNow ? (
              <Video size={15} color={colors.primaryForeground} />
            ) : (
              <MessageCircle size={15} color={colors.primaryForeground} />
            )}
            <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
              {canCallNow ? t.home.videoConsultation : t.home.startConsultation}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
    overflow: "visible",
  },
  row: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  rowStacked: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
  },
  info: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 12,
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    justifyContent: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.15,
    lineHeight: 21,
  },
  specialty: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 17,
  },
  metaRow: {
    marginTop: 2,
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  metaGroup: {
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  metaStrong: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  metaMuted: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  sep: {
    fontSize: 12,
    lineHeight: 16,
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actions: {
    gap: 8,
    flexShrink: 0,
    justifyContent: "center",
    minWidth: 132,
  },
  // Prices belong with the doctor's details, not floating over the button.
  feePillSpacing: {
    marginTop: 8,
  },
  tagChips: {
    marginTop: 6,
    flexWrap: "wrap",
    gap: 6,
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
  },
  actionsStacked: {
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 0,
  },
  cta: {
    gap: 6,
    paddingHorizontal: 16,
    minWidth: 148,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
