import { Star } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { formatEgpPerUnit } from "@/utils/credits";
import { DoctorFeeLines } from "@/components/doctor/DoctorFeeLines";
import type { DoctorFees } from "@/domains/doctor/fees";

interface SubtitleProps {
  specialty?: string;
  isRTL: boolean;
}

export function DoctorSubtitle({ specialty, isRTL }: SubtitleProps) {
  const colors = useColors();
  if (!specialty) return null;

  return (
    <Text
      style={[
        styles.subtitle,
        { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
      ]}
      numberOfLines={1}
    >
      {specialty}
    </Text>
  );
}

interface TrailingProps {
  isRTL: boolean;
  rating?: number;
  ratingTotal?: number;
  consultationPrice?: number;
  /** Cash prices; whichever applies to the viewer's country is shown. */
  fees?: DoctorFees;
  showReviewCount?: boolean;
}

export function DoctorTrailingMeta({
  isRTL,
  rating,
  ratingTotal,
  consultationPrice,
  fees,
  showReviewCount = false,
}: TrailingProps) {
  const colors = useColors();
  const { t } = useI18n();
  const hasRating = rating != null && rating > 0;
  const price = consultationPrice ?? 1;
  const align = isRTL ? "flex-start" : "flex-end";

  return (
    <View style={[styles.trailing, { alignItems: align }]}>
      <View style={[styles.ratingLine, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Star size={11} color={colors.warning} fill={hasRating ? colors.warning : "transparent"} />
        <Text style={[styles.ratingValue, { color: colors.foreground }]}>
          {hasRating ? rating!.toFixed(1) : t.doctor.new}
        </Text>
      </View>

      {showReviewCount && hasRating && ratingTotal != null && ratingTotal > 0 ? (
        <Text style={[styles.reviewCount, { color: colors.mutedForeground, textAlign: isRTL ? "left" : "right" }]}>
          {ratingTotal} {t.doctor.reviews}
        </Text>
      ) : null}

      <DoctorFeeLines
        doctor={fees ?? {}}
        isRTL={isRTL}
        compact
        align="end"
        fallback={formatEgpPerUnit(price, t)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  trailing: {
    gap: 2,
    minWidth: 52,
  },
  ratingLine: {
    alignItems: "center",
    gap: 3,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  reviewCount: {
    fontSize: 11,
    lineHeight: 14,
  },
});
