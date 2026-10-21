import { MessageCircle, Video } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { isMarketCountryCode } from "@/constants/patientCountries";
import type { DoctorFees } from "@/domains/doctor/fees";
import { formatDoctorFee } from "@/domains/doctor/fees";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useViewerCountry } from "@/hooks/useViewerCountry";

type Props = {
  doctor: DoctorFees;
  isRTL: boolean;
  /** Shown when the doctor has set neither price (legacy credit pricing). */
  fallback?: string;
  /** Drops the labels and tightens the type for dense list rows. */
  compact?: boolean;
  /** Which edge the pill hugs — leading (default) or trailing. */
  align?: "start" | "end";
};

/**
 * The doctor's chat and video prices as one segmented pill, priced for whoever
 * is looking: local currency for patients in the doctor's country, USD for
 * everyone else. Patients use profile residence; others use IP.
 */
export function DoctorFeeLines({
  doctor,
  isRTL,
  fallback,
  compact,
  align = "start",
}: Props) {
  const colors = useColors();
  const { t } = useI18n();
  const viewerCountry = useViewerCountry();

  const inLocalMarket =
    !!viewerCountry && isMarketCountryCode(viewerCountry);
  const legacyFallback = inLocalMarket ? fallback : undefined;

  const text = formatDoctorFee(doctor, viewerCountry, "text");
  const video = formatDoctorFee(doctor, viewerCountry, "video");
  if (!text && !video && !legacyFallback) return null;

  const leading = isRTL ? "flex-end" : "flex-start";
  const trailing = isRTL ? "flex-start" : "flex-end";

  return (
    <View
      style={[
        styles.pill,
        compact && styles.pillCompact,
        {
          alignSelf: align === "end" ? trailing : leading,
          backgroundColor: colors.muted,
          borderColor: colors.border,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}
    >
      {text || !video ? (
        <Segment
          Icon={MessageCircle}
          label={t.home.textConsultationShort}
          value={text ?? legacyFallback ?? ""}
          compact={compact}
          isRTL={isRTL}
        />
      ) : null}
      {text && video ? (
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      ) : null}
      {video ? (
        <Segment
          Icon={Video}
          label={t.home.videoConsultationShort}
          value={video}
          compact={compact}
          isRTL={isRTL}
        />
      ) : null}
    </View>
  );
}

function Segment({
  Icon,
  label,
  value,
  compact,
  isRTL,
}: {
  Icon: typeof MessageCircle;
  label: string;
  value: string;
  compact?: boolean;
  isRTL: boolean;
}) {
  const colors = useColors();

  return (
    <View
      style={[styles.segment, { flexDirection: isRTL ? "row-reverse" : "row" }]}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Icon size={compact ? 11 : 12} color={colors.mutedForeground} />
      {!compact ? (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      ) : null}
      <Text
        style={[styles.value, compact && styles.valueCompact, { color: colors.foreground }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 8,
  },
  pillCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 6,
  },
  segment: {
    alignItems: "center",
    gap: 4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    marginVertical: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  value: {
    fontSize: 12.5,
    fontWeight: "800",
    lineHeight: 16,
  },
  valueCompact: {
    fontSize: 11.5,
    lineHeight: 15,
  },
});
