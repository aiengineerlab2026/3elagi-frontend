import { Star } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { DoctorProfileSection } from "@/components/doctor/DoctorProfileSection";
import {
  emptyStateSurface,
  primaryButton,
  secondaryButton,
  surfaceCard,
  UI,
} from "@/constants/uiTokens";
import type { DoctorReviewItem, DoctorReviewStatus } from "@/domains/doctor/api";
import { formatReviewDate } from "@/components/doctor/doctorProfileLocation";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { flexRow } from "@/utils/rtl";

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
          <Star size={28} color="#f59e0b" fill={n <= value ? "#f59e0b" : "transparent"} />
        </Pressable>
      ))}
    </View>
  );
}

function ReviewCard({
  item,
  isRTL,
  locale,
  colors,
  stacked,
}: {
  item: DoctorReviewItem;
  isRTL: boolean;
  locale: string;
  colors: ReturnType<typeof useColors>;
  stacked?: boolean;
}) {
  const dir = flexRow(isRTL);
  const textAlign = isRTL ? "right" : "left";
  const dateLabel = formatReviewDate(item.createdAt, locale);

  return (
    <View style={[styles.reviewCard, surfaceCard(colors.card, colors.border)]}>
      <View
        style={[
          styles.reviewHeader,
          stacked ? styles.reviewHeaderMobile : { flexDirection: dir },
        ]}
      >
        <View style={styles.reviewerBlock}>
          <Text style={[styles.reviewerName, { color: colors.foreground, textAlign }]}>
            {item.patientName}
          </Text>
          {dateLabel ? (
            <Text style={[styles.reviewDate, { color: colors.mutedForeground, textAlign }]}>
              {dateLabel}
            </Text>
          ) : null}
        </View>
        <View style={styles.starMiniRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={12} color="#f59e0b" fill={n <= item.rating ? "#f59e0b" : "transparent"} />
          ))}
        </View>
      </View>
      {item.comment ? (
        <Text style={[styles.reviewComment, { color: colors.mutedForeground, textAlign }]}>
          {item.comment}
        </Text>
      ) : null}
    </View>
  );
}

function gridStyle(columns: number): ViewStyle {
  if (columns <= 1) {
    return { flexDirection: "column", gap: 8 };
  }
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: 10,
  } as unknown as ViewStyle;
}

type Props = {
  reviews: DoctorReviewItem[];
  reviewTotal: number;
  reviewStatus: DoctorReviewStatus | null;
  isPatient: boolean;
  reviewRating: number;
  onReviewRatingChange: (n: number) => void;
  reviewComment: string;
  onReviewCommentChange: (s: string) => void;
  submitting: boolean;
  onSubmitReview: () => void;
  reviewColumns?: number;
};

export function DoctorProfileReviewsSection({
  reviews,
  reviewTotal,
  reviewStatus,
  isPatient,
  reviewRating,
  onReviewRatingChange,
  reviewComment,
  onReviewCommentChange,
  submitting,
  onSubmitReview,
  reviewColumns = 1,
}: Props) {
  const colors = useColors();
  const { isRTL, locale } = useI18n();
  const { isMobile } = useWebLayout();
  const dir = flexRow(isRTL);
  const textAlign = isRTL ? "right" : "left";
  const count = reviewTotal > 0 ? reviewTotal : reviews.length;
  const [formOpen, setFormOpen] = useState(false);
  const prevSubmitting = useRef(submitting);

  useEffect(() => {
    if (prevSubmitting.current && !submitting) {
      setFormOpen(false);
    }
    prevSubmitting.current = submitting;
  }, [submitting]);

  const canReview = isPatient && reviewStatus?.canReview;
  const showHint = isPatient && reviewStatus && !reviewStatus.canReview;

  return (
    <DoctorProfileSection
      title={isRTL ? `التقييمات (${count})` : `Reviews (${count})`}
      textAlign={textAlign}
    >
      {reviews.length === 0 ? (
        <View style={[styles.empty, emptyStateSurface(colors.card, colors.border)]}>
          <Star size={18} color={colors.mutedForeground} strokeWidth={1.75} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign: "center" }]}>
            {isRTL ? "لا توجد تقييمات بعد." : "No reviews yet."}
          </Text>
        </View>
      ) : (
        <View style={gridStyle(reviewColumns)}>
          {reviews.map((r) => (
            <ReviewCard
              key={r.id}
              item={r}
              isRTL={isRTL}
              locale={locale}
              colors={colors}
              stacked={isMobile}
            />
          ))}
        </View>
      )}

      {canReview ? (
        <View style={styles.writeBlock}>
          {!formOpen ? (
            <Pressable
              onPress={() => setFormOpen(true)}
              style={({ pressed }) => [
                secondaryButton(colors.border, colors.card),
                styles.writeBtn,
                { opacity: pressed ? 0.92 : 1 },
              ]}
            >
              <Text style={[styles.writeBtnText, { color: colors.primary }]}>
                {reviewStatus?.hasExistingReview
                  ? isRTL
                    ? "تعديل تقييمك"
                    : "Edit your review"
                  : isRTL
                    ? "اكتب تقييمًا"
                    : "Write a review"}
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.form, surfaceCard(colors.card, colors.border)]}>
              <StarPicker value={reviewRating} onChange={onReviewRatingChange} />
              <AppTextInput
                value={reviewComment}
                onChangeText={onReviewCommentChange}
                placeholder={isRTL ? "تعليق اختياري…" : "Optional comment…"}
                placeholderTextColor={colors.mutedForeground}
                multiline
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.muted,
                    color: colors.foreground,
                    textAlign,
                  },
                ]}
              />
              <View style={[styles.formActions, { flexDirection: dir }]}>
                {!reviewStatus?.hasExistingReview ? (
                  <Pressable onPress={() => setFormOpen(false)} hitSlop={8}>
                    <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
                      {isRTL ? "إلغاء" : "Cancel"}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => void onSubmitReview()}
                  disabled={submitting}
                  style={[
                    primaryButton(),
                    styles.submitBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: submitting ? 0.7 : 1,
                      marginLeft: isRTL ? 0 : "auto",
                      marginRight: isRTL ? "auto" : 0,
                    },
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>
                      {reviewStatus?.hasExistingReview
                        ? isRTL
                          ? "تحديث"
                          : "Update"
                        : isRTL
                          ? "إرسال"
                          : "Submit"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      ) : null}

      {showHint ? (
        <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: "center" }]}>
          {isRTL
            ? "يمكنك تقييم الطبيب بعد أن يضيف تشخيصًا لك."
            : "You can review this doctor after they add a diagnosis for you."}
        </Text>
      ) : null}
    </DoctorProfileSection>
  );
}

const styles = StyleSheet.create({
  empty: {
    paddingVertical: UI.space.md,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  writeBlock: {
    marginTop: 2,
  },
  writeBtn: {
    paddingVertical: 10,
  },
  writeBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  form: {
    padding: UI.space.md,
    gap: UI.space.sm,
  },
  starRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  input: {
    minHeight: 72,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  formActions: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  submitBtn: {
    minWidth: 100,
  },
  submitText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  reviewCard: {
    padding: UI.space.sm + 4,
    gap: 4,
  },
  reviewHeader: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  reviewHeaderMobile: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
  },
  reviewerBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  reviewerName: {
    fontWeight: "700",
    fontSize: 14,
  },
  reviewDate: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  starMiniRow: {
    flexDirection: "row",
    gap: 2,
  },
  reviewComment: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
  },
});
