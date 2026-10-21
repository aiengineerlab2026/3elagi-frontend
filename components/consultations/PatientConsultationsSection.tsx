import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { PatientConsultationCard } from "@/components/consultations/PatientConsultationCard";
import { emptyStateSurface, UI } from "@/constants/uiTokens";
import {
  fetchPatientConsultations,
  type PatientConsultation,
} from "@/domains/consultations/api";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";
import { showErrorToast } from "@/utils/toast";

export type PatientConsultationStatusFilter =
  | "all"
  | "open"
  | "pending"
  | "ended"
  | "cancelled";

function parseStatusFilter(value?: string | string[]): PatientConsultationStatusFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "open" || raw === "pending" || raw === "ended" || raw === "cancelled") {
    return raw;
  }
  return "all";
}

function matchesFilter(
  item: PatientConsultation,
  filter: PatientConsultationStatusFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "cancelled") {
    return item.status === "cancelled" || item.status === "rejected";
  }
  return item.status === filter;
}

export function PatientConsultationsSection() {
  const colors = useColors();
  const { t, isRTL, locale } = useI18n();
  const accessToken = useAuthStore((s) => s.accessToken);
  const textAlign = alignText(isRTL);
  const dir = flexRow(isRTL);
  const { status: statusParam } = useLocalSearchParams<{ status?: string | string[] }>();

  const [items, setItems] = useState<PatientConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PatientConsultationStatusFilter>(() =>
    parseStatusFilter(statusParam),
  );

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setItems(await fetchPatientConsultations(accessToken));
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, t.common.error]);

  useFocusEffect(
    useCallback(() => {
      setStatusFilter(parseStatusFilter(statusParam));
      void load();
    }, [load, statusParam]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, statusFilter)),
    [items, statusFilter],
  );

  const filterOptions = useMemo(
    (): { key: PatientConsultationStatusFilter; label: string }[] => [
      { key: "all", label: t.consultations.filterAll },
      { key: "open", label: t.consultations.open },
      { key: "pending", label: t.consultations.pending },
      { key: "ended", label: t.consultations.completed },
      { key: "cancelled", label: t.consultations.cancelled },
    ],
    [t],
  );

  const counts = useMemo(() => {
    const keys: PatientConsultationStatusFilter[] = [
      "all",
      "open",
      "pending",
      "ended",
      "cancelled",
    ];
    return keys.reduce(
      (acc, key) => {
        acc[key] = items.filter((item) => matchesFilter(item, key)).length;
        return acc;
      },
      {} as Record<PatientConsultationStatusFilter, number>,
    );
  }, [items]);

  const emptyMessage =
    statusFilter === "all"
      ? isRTL
        ? "ستظهر استشاراتك هنا بعد بدء محادثة مع طبيب."
        : "Your consultations will appear here after you start a chat with a doctor."
      : t.consultations.noConsultationsForFilter;

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
  }

  return (
    <FlatList
      style={styles.list}
      data={filteredItems}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.listTitle, { color: colors.foreground, textAlign }]}>
            {t.consultations.myConsultations}
          </Text>
          <Text style={[styles.filterLabel, { color: colors.mutedForeground, textAlign }]}>
            {t.consultations.statusFilter}
          </Text>
          <View style={[styles.filters, { flexDirection: dir }]}>
            {filterOptions.map((option) => {
              const active = statusFilter === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setStatusFilter(option.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [
                    styles.filterChip,
                    {
                      backgroundColor: active ? colors.primary : colors.muted,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? colors.primaryForeground : colors.foreground, textAlign },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {counts[option.key] > 0 ? (
                    <View
                      style={[
                        styles.filterBadge,
                        {
                          backgroundColor: active
                            ? "rgba(255,255,255,0.22)"
                            : `${colors.primary}18`,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: active ? colors.primaryForeground : colors.primary,
                          fontSize: 11,
                          fontWeight: "700",
                        }}
                      >
                        {counts[option.key] > 99 ? "99+" : String(counts[option.key])}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      }
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <View style={[styles.empty, emptyStateSurface(colors.card, colors.border)]}>
          <MessageCircle size={22} color={colors.mutedForeground} strokeWidth={1.75} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {statusFilter === "all" ? t.consultations.noConsultations : t.consultations.noConsultationsForFilter}
          </Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{emptyMessage}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <PatientConsultationCard
          item={item}
          locale={locale}
          onRemoved={() => void load()}
          onPaymentUpdated={() => void load()}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: UI.space.sm }} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: {
    padding: UI.space.md,
    paddingBottom: UI.space.lg,
    gap: UI.space.sm,
  },
  header: {
    gap: UI.space.sm,
    marginBottom: UI.space.sm,
  },
  listTitle: {
    ...UI.type.section,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  filters: {
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: UI.radius.chip,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    marginTop: UI.space.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 280,
  },
});
