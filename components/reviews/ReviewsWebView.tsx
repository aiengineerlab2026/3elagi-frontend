import { useFocusEffect } from "@react-navigation/native";
import { RefreshCw, Star } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WEB_MAX_WIDTH } from "@/constants/webLayout";
import { fetchMyReviews, type MyReviewItem } from "@/domains/doctor/api";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { alignText, flexRow, localeTag } from "@/utils/rtl";

const PAGE_LIMIT = 10;

// ── StarRating ────────────────────────────────────────────────────────────────

interface StarRatingProps {
  rating: number;
  colors: ReturnType<typeof useColors>;
}

function StarRating({ rating, colors }: StarRatingProps) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={15}
          color={n <= rating ? "#f59e0b" : colors.border}
          fill={n <= rating ? "#f59e0b" : "transparent"}
        />
      ))}
    </View>
  );
}

// ── ReviewCard ────────────────────────────────────────────────────────────────

interface ReviewCardProps {
  item: MyReviewItem;
  isRTL: boolean;
  colors: ReturnType<typeof useColors>;
}

function ReviewCard({ item, isRTL, colors }: ReviewCardProps) {
  const textAlign = alignText(isRTL);
  const date = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString(localeTag(isRTL), {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <View
      testID="review-card"
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.cardTop, { flexDirection: flexRow(isRTL) }]}>
        <Text
          style={[styles.patientName, { color: colors.foreground, flex: 1, textAlign }]}
          numberOfLines={1}
        >
          {item.patientName || (isRTL ? "مريض" : "Patient")}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>{date}</Text>
      </View>
      <StarRating rating={item.rating} colors={colors} />
      {item.comment ? (
        <Text style={[styles.comment, { color: colors.foreground, textAlign }]}>
          {item.comment}
        </Text>
      ) : null}
    </View>
  );
}

// ── ReviewsWebView ────────────────────────────────────────────────────────────

export function ReviewsWebView() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isDesktop } = useWebLayout();
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);

  const isDoctor = role?.toLowerCase() === "doctor";
  const textAlign = alignText(isRTL);

  const [items, setItems] = useState<MyReviewItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!accessToken) return;
      try {
        setError(null);
        const res = await fetchMyReviews(accessToken, pageNum, PAGE_LIMIT);
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
        setPage(res.pagination.page);
        setTotalPages(res.pagination.totalPages);
        setTotal(res.pagination.total);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [accessToken],
  );

  const initialLoad = useCallback(async () => {
    setLoading(true);
    await load(1, false);
    setLoading(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!isDoctor) return;
      void initialLoad();
    }, [isDoctor, initialLoad]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(1, false);
    setRefreshing(false);
  };

  const onLoadMore = async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    await load(page + 1, true);
    setLoadingMore(false);
  };

  if (!isDoctor) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={{ color: colors.mutedForeground }}>
            {isRTL ? "للأطباء فقط" : "For doctors only"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
      >
        <View style={[styles.container, { maxWidth: WEB_MAX_WIDTH.wide }]}>
          {/* Page header */}
          <View
            style={[
              styles.pageHeader,
              isDesktop && [styles.pageHeaderDesktop, { borderBottomColor: colors.border }],
              { flexDirection: flexRow(isRTL) },
            ]}
          >
            <View style={[styles.titleIconWrap, { backgroundColor: `${colors.primary}14` }]}>
              <Star size={22} color={colors.primary} fill="transparent" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={[styles.titleRow, { flexDirection: flexRow(isRTL) }]}>
                <Text style={[styles.pageTitle, { color: colors.foreground, textAlign }]}>
                  {t.reviews.title}
                </Text>
                {total > 0 ? (
                  <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                      {total}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Refresh button */}
            <Pressable
              testID="refresh-btn"
              onPress={() => void onRefresh()}
              disabled={refreshing}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.refreshBtn,
                {
                  borderColor: colors.border,
                  backgroundColor:
                    pressed || hovered ? colors.muted : "transparent",
                  opacity: refreshing ? 0.6 : 1,
                },
              ]}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <RefreshCw size={16} color={colors.mutedForeground} />
              )}
            </Pressable>
          </View>

          {/* Loading state */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : error ? (
            /* Error state */
            <View style={styles.center}>
              <Text
                testID="error-message"
                style={[styles.errorText, { textAlign }]}
              >
                {error}
              </Text>
              <Pressable
                testID="retry-btn"
                onPress={() => void initialLoad()}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.retryBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor:
                      pressed || hovered ? `${colors.primary}12` : "transparent",
                  },
                ]}
              >
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                  {t.reviews.errorRetry}
                </Text>
              </Pressable>
            </View>
          ) : items.length === 0 ? (
            /* Empty state */
            <View style={styles.center} testID="empty-state">
              <Text style={[styles.emptyTitle, { color: colors.foreground, textAlign }]}>
                {t.reviews.empty}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.mutedForeground, textAlign }]}>
                {t.reviews.emptyHint}
              </Text>
            </View>
          ) : (
            /* Reviews list */
            <View style={styles.list}>
              {items.map((item) => (
                <ReviewCard key={item.id} item={item} isRTL={isRTL} colors={colors} />
              ))}

              {/* Load more button */}
              {page < totalPages ? (
                <Pressable
                  testID="load-more-btn"
                  onPress={() => void onLoadMore()}
                  disabled={loadingMore}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.loadMoreBtn,
                    {
                      borderColor: colors.primary,
                      backgroundColor:
                        pressed || hovered ? `${colors.primary}10` : "transparent",
                      opacity: loadingMore ? 0.7 : 1,
                    },
                  ]}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={{ color: colors.primary, fontWeight: "700" }}>
                      {t.reviews.loadMore}
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, width: "100%" },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  scrollContentDesktop: {
    paddingHorizontal: 32,
    paddingTop: 12,
    paddingBottom: 48,
  },
  container: { width: "100%", gap: 0 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
    gap: 8,
  },
  pageHeader: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  pageHeaderDesktop: {
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  titleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  pageTitle: { fontSize: 24, fontWeight: "800" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { fontSize: 13, fontWeight: "700" },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    gap: 12,
    paddingTop: 4,
    paddingBottom: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    gap: 10,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTop: {
    alignItems: "center",
    gap: 8,
  },
  patientName: { fontSize: 15, fontWeight: "700" },
  date: { fontSize: 12, fontWeight: "500" },
  stars: { flexDirection: "row", gap: 3 },
  comment: { fontSize: 14, lineHeight: 21 },
  emptyTitle: { fontSize: 18, fontWeight: "800" },
  emptyHint: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  errorText: { color: "#ef4444", fontSize: 14, lineHeight: 21 },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  loadMoreBtn: {
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
});
