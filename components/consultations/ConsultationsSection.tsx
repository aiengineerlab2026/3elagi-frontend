import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ConsultationListPaymentPanel } from "@/components/consultations/ConsultationListPaymentPanel";
import {
  consultationNeedsPaymentPanel,
  consultationPaymentBadge,
} from "@/components/consultations/consultationPaymentMeta";
import {
  fetchMyConsultations,
  type DoctorConsultation,
} from "@/domains/consultations/api";
import { formatUsd, pointsToUsd } from "@/domains/points/usd";
import { countryFlagEmoji } from "@/constants/patientCountries";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useRemoveConsultation } from "@/hooks/useRemoveConsultation";
import { webConfirm } from "@/utils/webConfirm";
import { showErrorToast } from "@/utils/toast";
import { flexRow } from "@/utils/rtl";

export function ConsultationsSection() {
  const colors = useColors();
  const { t, isRTL, locale } = useI18n();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { remove } = useRemoveConsultation();
  const dir = flexRow(isRTL);
  const textAlign = isRTL ? "right" : "left";

  const [items, setItems] = useState<DoctorConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setItems(await fetchMyConsultations(accessToken));
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

  const statusMeta = (status: DoctorConsultation["status"]) => {
    if (status === "open") return { color: colors.primary, text: t.consultations.open };
    if (status === "ended") return { color: "#0d9488", text: t.consultations.completed };
    return { color: "#dc2626", text: t.consultations.cancelled };
  };

  // Doctors are paid outside the app now, so the reimburse flow is gone; the
  // header just totals what the listed consultations are worth in USD.
  const totalUsd = items.reduce(
    (sum, c) =>
      sum + pointsToUsd(c.reserved_points ?? 0, c.patient_country, c.point_price_usd),
    0,
  );

  const header = (
    <View style={[styles.reimburseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.reimburseLabel, { color: colors.mutedForeground, textAlign }]}>
        {t.consultations.consultationsTotalUsd}
      </Text>
      <Text style={[styles.reimburseValue, { color: colors.primary, textAlign }]}>
        {formatUsd(totalUsd)}
      </Text>
      <Text style={[styles.listTitle, { color: colors.foreground, textAlign }]}>
        {t.consultations.myConsultations}
      </Text>
    </View>
  );

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
  }

  return (
    <FlatList
      style={styles.list}
      data={items}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={header}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          {t.consultations.noConsultations}
        </Text>
      }
      renderItem={({ item }) => {
        const s = statusMeta(item.status);
        const paymentBadge = consultationPaymentBadge(item, true, t, colors);
        const showPayment = consultationNeedsPaymentPanel(item);
        const refunded = item.complaint_status === "accepted";
        const date = new Date(item.created_at).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US");
        const Chevron = isRTL ? ChevronLeft : ChevronRight;
        return (
          <View
            style={[
              styles.rowWrap,
              {
                backgroundColor: colors.card,
                borderColor: paymentBadge ? `${paymentBadge.color}33` : colors.border,
              },
            ]}
          >
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/chat/[id]",
                params: { id: item.patient_id, consultationId: item.id },
              })
            }
            style={({ pressed }) => [
              styles.row,
              {
                flexDirection: dir,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.name, { color: colors.foreground, textAlign }]} numberOfLines={1}>
                {/* Country the consultation was requested from. */}
                {item.patient_country
                  ? `${countryFlagEmoji(item.patient_country)} `
                  : ""}
                {item.patient_name}
              </Text>
              {item.description ? (
                <Text
                  style={[styles.desc, { color: colors.mutedForeground, textAlign }]}
                  numberOfLines={1}
                >
                  {item.description}
                </Text>
              ) : null}
              <Text style={[styles.date, { color: colors.mutedForeground, textAlign }]}>
                {date} ·{" "}
                {formatUsd(
                  pointsToUsd(
                    item.reserved_points,
                    item.patient_country,
                    item.point_price_usd,
                  ),
                )}
                {/* The country is what sets that value — name it here too. */}
                {item.patient_country ? ` · ${item.patient_country.toUpperCase()}` : ""}
              </Text>
            </View>
            <View style={styles.badges}>
              {paymentBadge ? (
                <View style={[styles.badge, { backgroundColor: `${paymentBadge.color}1F` }]}>
                  <Text style={{ color: paymentBadge.color, fontWeight: "800", fontSize: 12 }}>
                    {paymentBadge.label}
                  </Text>
                </View>
              ) : (
              <View style={[styles.badge, { backgroundColor: `${s.color}1F` }]}>
                <Text style={{ color: s.color, fontWeight: "800", fontSize: 12 }}>{s.text}</Text>
              </View>
              )}
              {refunded ? (
                <View style={[styles.badge, { backgroundColor: "#dc26261F" }]}>
                  <Text style={{ color: "#dc2626", fontWeight: "800", fontSize: 12 }}>
                    {t.consultations.refunded}
                  </Text>
                </View>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel={t.consultations.removeConsultation}
              onPress={(event) => {
                event.stopPropagation?.();
                remove(item.id, item.patient_id, () => void load());
              }}
              hitSlop={8}
              style={({ pressed }) => [
                styles.removeBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: pressed ? "#dc262614" : colors.card,
                },
              ]}
            >
              <Trash2 size={16} color="#dc2626" />
            </Pressable>
            <Chevron size={18} color={colors.mutedForeground} />
          </Pressable>
          {showPayment ? (
            <View style={styles.paymentSection}>
            <ConsultationListPaymentPanel
              item={item}
              isDoctor
              onUpdated={() => void load()}
            />
            </View>
          ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  reimburseCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    gap: 8,
  },
  reimburseLabel: { fontSize: 13, fontWeight: "600" },
  reimburseRow: { alignItems: "center", justifyContent: "space-between", gap: 12 },
  reimburseValue: { fontSize: 34, fontWeight: "800" },
  reimburseBtn: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  reimburseBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  listTitle: { fontSize: 15, fontWeight: "800", marginTop: 6 },
  rowWrap: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  row: {
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  paymentSection: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  name: { fontSize: 15, fontWeight: "700" },
  desc: { fontSize: 13 },
  date: { fontSize: 12 },
  badges: { alignItems: "flex-end", gap: 6 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { textAlign: "center", marginTop: 32, fontSize: 14 },
});
