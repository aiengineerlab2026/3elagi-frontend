import { Star } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { primaryButton, UI } from "@/constants/uiTokens";
import {
  APP_REVIEW_IMPROVEMENT_TAGS,
  type AppReviewImprovementTag,
} from "@/domains/appReviews/improvementTags";
import {
  fetchMyAppReview,
  submitAppReview,
} from "@/domains/appReviews/api";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={disabled}
          onPress={() => onChange(n)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${n} stars`}
        >
          <Star
            size={34}
            color="#f59e0b"
            fill={n <= value ? "#f59e0b" : "transparent"}
          />
        </Pressable>
      ))}
    </View>
  );
}

type Props = {
  showHero?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function RateUsForm({ showHero = false, style }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<AppReviewImprovementTag[]>([]);
  const [ratingError, setRatingError] = useState<string | undefined>();
  const [loadingMine, setLoadingMine] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setLoadingMine(false);
      return;
    }
    void fetchMyAppReview(accessToken)
      .then((row) => {
        if (!row) return;
        setRating(row.rating);
        setComment(row.comment ?? "");
        setTags(
          (row.improvement_tags ?? []).filter((tag): tag is AppReviewImprovementTag =>
            (APP_REVIEW_IMPROVEMENT_TAGS as readonly string[]).includes(tag),
          ),
        );
      })
      .catch(() => undefined)
      .finally(() => setLoadingMine(false));
  }, [accessToken]);

  const toggleTag = (tag: AppReviewImprovementTag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const submit = async () => {
    if (!accessToken) return;
    if (rating < 1) {
      setRatingError(t.rateUs.ratingRequired);
      return;
    }
    setRatingError(undefined);
    setSending(true);
    try {
      await submitAppReview(accessToken, {
        rating,
        comment,
        improvementTags: tags,
      });
      setSent(true);
      showSuccessToast(t.rateUs.sent);
    } catch (e) {
      showErrorToast(t.rateUs.sendFailed, (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (loadingMine) {
    return (
      <View style={[styles.wrap, style, styles.loadingWrap]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      {showHero ? (
        <View style={[styles.hero, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <Text style={[styles.heroTitle, { color: colors.foreground, textAlign }]}>
            {t.rateUs.title}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.mutedForeground, textAlign }]}>
            {t.rateUs.subtitle}
          </Text>
        </View>
      ) : null}

      {sent ? (
        <View
          style={[
            styles.successBanner,
            {
              backgroundColor: `${colors.primary}12`,
              borderColor: `${colors.primary}44`,
            },
          ]}
        >
          <Text style={[styles.successNote, { color: colors.primary, textAlign }]}>
            {t.rateUs.sent}
          </Text>
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={[styles.label, { color: colors.foreground, textAlign }]}>
          {t.rateUs.ratingLabel}
        </Text>
        <StarPicker
          value={rating}
          onChange={(n) => {
            setRating(n);
            if (ratingError) setRatingError(undefined);
          }}
          disabled={sending}
        />
        {ratingError ? (
          <Text style={[styles.fieldError, { color: colors.destructive }]}>{ratingError}</Text>
        ) : null}
      </View>

      <View style={styles.block}>
        <Text style={[styles.label, { color: colors.foreground, textAlign }]}>
          {t.rateUs.suggestionsLabel}
        </Text>
        <View style={[styles.chipRow, { flexDirection: dir }]}>
          {APP_REVIEW_IMPROVEMENT_TAGS.map((tag) => {
            const active = tags.includes(tag);
            return (
              <Pressable
                key={tag}
                disabled={sending}
                onPress={() => toggleTag(tag)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? `${colors.primary}18` : colors.muted,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? colors.primary : colors.foreground,
                    fontWeight: "700",
                    fontSize: 13,
                    textAlign,
                  }}
                >
                  {t.rateUs.suggestions[tag]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={[styles.label, { color: colors.foreground, textAlign }]}>
          {t.rateUs.commentLabel}
        </Text>
        <AppTextInput
          value={comment}
          onChangeText={setComment}
          placeholder={t.rateUs.commentPlaceholder}
          multiline
          editable={!sending}
          style={[
            styles.commentInput,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
              textAlign,
            },
          ]}
        />
      </View>

      <Pressable
        onPress={() => void submit()}
        disabled={sending}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          primaryButton(),
          styles.sendBtn,
          UI.shadowMd,
          {
            backgroundColor: sending ? colors.mutedForeground : colors.primary,
            opacity: pressed || hovered ? 0.92 : 1,
          },
        ]}
      >
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.sendText, { color: colors.primaryForeground }]}>
            {t.rateUs.submit}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: UI.space.lg },
  loadingWrap: { alignItems: "center", paddingVertical: 40 },
  hero: { gap: UI.space.sm, marginBottom: UI.space.xs },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: UI.space.md,
    maxWidth: 520,
  },
  successBanner: {
    borderWidth: 1,
    borderRadius: UI.radius.inner,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successNote: { fontSize: 14, fontWeight: "700" },
  block: { gap: 10 },
  label: { fontSize: 13, fontWeight: "700" },
  starRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  fieldError: { fontSize: 12, fontWeight: "600" },
  chipRow: { flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: UI.radius.inner,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },
  sendBtn: {
    marginTop: UI.space.sm,
    borderRadius: UI.radius.card,
    paddingVertical: 15,
  },
  sendText: { fontSize: 16, fontWeight: "800" },
});
