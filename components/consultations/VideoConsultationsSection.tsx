import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { Video } from "lucide-react-native";
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
import { VideoAppointmentPaymentPanel } from "@/components/consultations/VideoAppointmentPaymentPanel";
import {
  videoAppointmentNeedsPaymentPanel,
  videoAppointmentPaymentBadge,
} from "@/components/consultations/videoAppointmentPaymentMeta";
import { emptyStateSurface, UI } from "@/constants/uiTokens";
import {
  fetchMyAppointments,
  fetchMyVideoConsultations,
  type UpcomingAppointment,
} from "@/domains/appointments/api";
import { mergeVideoConsultationLists } from "@/domains/appointments/upcomingVideoCalls";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";
import { showErrorToast } from "@/utils/toast";

type Props = {
  isDoctor: boolean;
};

export function VideoConsultationsSection({ isDoctor }: Props) {
  const colors = useColors();
  const { t, isRTL, locale } = useI18n();
  const accessToken = useAuthStore((s) => s.accessToken);
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);

  const [items, setItems] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [videoItems, myItems] = await Promise.all([
        fetchMyVideoConsultations(accessToken).catch(() => [] as UpcomingAppointment[]),
        fetchMyAppointments(accessToken).catch(() => [] as UpcomingAppointment[]),
      ]);
      setItems(mergeVideoConsultationLists(videoItems, myItems));
    } catch (e) {
      showErrorToast(t.common.error, (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, t.common.error]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const sortedItems = useMemo(() => {
    const rank = (item: UpcomingAppointment) => {
      const pay = item.payment_status ?? "none";
      if (pay === "awaiting_payment") return 0;
      if (pay === "proof_submitted") return 1;
      return 2;
    };
    return [...items].sort((a, b) => {
      const byPayment = rank(a) - rank(b);
      if (byPayment !== 0) return byPayment;
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.time ?? "").localeCompare(b.time ?? "");
    });
  }, [items]);

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: t.consultations.pending,
      confirmed: isRTL ? "مؤكد" : "Confirmed",
      waiting: isRTL ? "بالانتظار" : "Waiting",
      active: isRTL ? "نشط" : "Active",
    };
    return map[status] ?? status;
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
  }

  return (
    <FlatList
      style={styles.list}
      data={sortedItems}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <View style={[styles.empty, emptyStateSurface(colors.card, colors.border)]}>
          <Video size={22} color={colors.mutedForeground} strokeWidth={1.75} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {t.consultations.noVideoConsultations}
          </Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground, textAlign }]}>
            {t.consultations.noVideoConsultationsHint}
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const paymentBadge = videoAppointmentPaymentBadge(item, isDoctor, t, colors);
        const showPayment = videoAppointmentNeedsPaymentPanel(item);
        const created = new Date(item.date);
        const dateLabel = created.toLocaleDateString(locale === "ar" ? "ar-EG" : locale, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const timeLabel = item.time?.slice(0, 5) ?? "";

        return (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: paymentBadge ? `${paymentBadge.color}33` : colors.border,
              },
            ]}
          >
            <Pressable
              onPress={() => {
                if (!item.other_user_id) return;
                router.push({
                  pathname: "/chat/[id]",
                  params: { id: item.other_user_id },
                });
              }}
              style={({ pressed }) => [
                styles.cardRow,
                { flexDirection: dir, opacity: pressed ? 0.92 : 1 },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}12` }]}>
                <Video size={18} color={colors.primary} />
              </View>
              <View style={styles.main}>
                <Text
                  style={[styles.name, { color: colors.foreground, textAlign }]}
                  numberOfLines={1}
                >
                  {item.other_name}
                </Text>
                <Text style={[styles.meta, { color: colors.mutedForeground, textAlign }]}>
                  {dateLabel}
                  {timeLabel ? ` · ${timeLabel}` : ""}
                </Text>
              </View>
              {paymentBadge ? (
                <View style={[styles.badge, { backgroundColor: `${paymentBadge.color}1F` }]}>
                  <Text style={{ color: paymentBadge.color, fontWeight: "800", fontSize: 11 }}>
                    {paymentBadge.label}
                  </Text>
                </View>
              ) : (
                <View style={[styles.badge, { backgroundColor: `${colors.primary}14` }]}>
                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 11 }}>
                    {statusLabel(item.status)}
                  </Text>
                </View>
              )}
            </Pressable>
            {showPayment ? (
              <VideoAppointmentPaymentPanel
                item={item}
                isDoctor={isDoctor}
                onUpdated={() => void load()}
              />
            ) : null}
          </View>
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: UI.space.sm }} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: {
    padding: UI.space.md,
    paddingBottom: UI.space.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: UI.space.sm + 4,
    gap: 8,
  },
  cardRow: {
    alignItems: "center",
    gap: UI.space.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "800",
  },
  meta: {
    fontSize: 12,
    fontWeight: "500",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 120,
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
