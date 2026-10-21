import { useFocusEffect } from "@react-navigation/native";
import { Star } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { useAuthStore } from "@/domains/auth/store";
import { fetchMyReviews, type MyReviewItem } from "@/domains/doctor/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow, localeTag } from "@/utils/rtl";

const PAGE_LIMIT = 10;

function StarRating({ rating, colors }: { rating: number; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          color={n <= rating ? "#f59e0b" : colors.border}
          fill={n <= rating ? "#f59e0b" : "transparent"}
        />
      ))}
    </View>
  );
}

function ReviewCard({
  item,
  isRTL,
  colors,
}: {
  item: MyReviewItem;
  isRTL: boolean;
  colors: ReturnType<typeof useColors>;
}) {
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

export default function ReviewsTab() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);

  const isDoctor = role?.toLowerCase() === "doctor";

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
        <AppHeader />
        <View style={styles.center}>
          <Text style={{ color: colors.mutedForeground }}>
            {isRTL ? "للأطباء فقط" : "For doctors only"}
          </Text>
        </View>
      </View>
    );
  }

  const textAlign = alignText(isRTL);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <View style={[styles.heading, { flexDirection: flexRow(isRTL) }]}>
        <Star size={22} color={colors.primary} fill="transparent" />
        <Text style={[styles.h1, { color: colors.foreground }]}>
          {t.reviews.title}
        </Text>
        {total > 0 ? (
          <Text style={[styles.badge, { backgroundColor: colors.muted, color: colors.mutedForeground }]}>
            {total}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: "#ef4444", textAlign: "center", paddingHorizontal: 24 }}>
            {error}
          </Text>
          <Pressable
            onPress={() => void initialLoad()}
            style={[styles.retryBtn, { borderColor: colors.primary }]}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              {t.reviews.errorRetry}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyTitle, { color: colors.foreground, textAlign }]}>
                {t.reviews.empty}
              </Text>
              <Text style={[styles.emptyHint, { color: colors.mutedForeground, textAlign }]}>
                {t.reviews.emptyHint}
              </Text>
            </View>
          }
          ListFooterComponent={
            items.length > 0 && page < totalPages ? (
              <Pressable
                onPress={() => void onLoadMore()}
                disabled={loadingMore}
                style={[styles.loadMoreBtn, { borderColor: colors.primary }]}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {t.reviews.loadMore}
                  </Text>
                )}
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <ReviewCard item={item} isRTL={isRTL} colors={colors} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  heading: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  h1: { fontSize: 20, fontWeight: "800", flex: 1 },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 4,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  cardTop: {
    alignItems: "center",
    gap: 8,
  },
  patientName: { fontSize: 15, fontWeight: "700" },
  date: { fontSize: 12, fontWeight: "500" },
  stars: { flexDirection: "row", gap: 3 },
  comment: { fontSize: 14, lineHeight: 20 },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginBottom: 6 },
  emptyHint: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  loadMoreBtn: {
    marginTop: 4,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
});
