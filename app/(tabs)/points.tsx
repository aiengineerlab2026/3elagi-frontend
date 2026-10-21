import { Plus, Wallet } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { router } from "expo-router";
import { AppHeader } from "@/components/AppHeader";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import { PointsPieChart } from "@/components/PointsPieChart";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { reimbursePoints } from "@/domains/points/api";
import { usePointsStore } from "@/domains/points/store";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Redirect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useIpPointPricing } from "@/hooks/useIpPointPricing";
import { usePointsPage } from "@/hooks/usePointsPage";
import { formatMoney } from "@/utils/credits";
import { flexRow } from "@/utils/rtl";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

export default function PointsTab() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const isDoctor = role?.toLowerCase() === "doctor";
  const loadPoints = usePointsStore((s) => s.loadPoints);
  const tabBarHeight = useBottomTabBarHeight();
  const dir = flexRow(isRTL);
  const textAlign = isRTL ? "right" : "left";
  // Price follows the caller's IP (Egypt $2 / Jordan $15 / elsewhere $50 USD).
  const { rate, currency, moneyForAmount } = useIpPointPricing();

  const {
    loading,
    displaySummary,
    amountText,
    setAmountText,
    parseAmount,
    summary,
    t,
  } = usePointsPage();

  const [modalOpen, setModalOpen] = useState(false);
  const [reimbursing, setReimbursing] = useState(false);

  const doReimburse = async () => {
    if (!accessToken) return;
    setReimbursing(true);
    try {
      const updated = await reimbursePoints(accessToken);
      await loadPoints(accessToken);
      showSuccessToast(
        t.credits.reimbursementRequested,
        t.credits.reimbursedTotal(updated.points_reimbursed_total ?? 0),
      );
    } catch (e) {
      showErrorToast(t.credits.reimburseFailed, (e as Error).message);
    } finally {
      setReimbursing(false);
    }
  };

  const confirmReimburse = () => {
    if (displaySummary.message_points <= 0) return;
    Alert.alert(
      t.credits.reimburse,
      t.credits.reimburseConfirm(displaySummary.message_points),
      [
        { text: t.common.cancel, style: "cancel" },
        { text: t.consultations.reimburse, onPress: () => void doReimburse() },
      ],
    );
  };

  if (!isSignedIn(profile, accessToken)) {
    return <Redirect href="/welcome" />;
  }

  const handleSubmit = () => {
    const amount = parseAmount();
    if (!amount) return;
    setModalOpen(false);
    router.push(`/points/checkout?amount=${amount}`);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <KeyboardSafeScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(24, tabBarHeight) + 16 },
        ]}
      >
        <View style={[styles.heading, { flexDirection: dir }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t.credits.title}</Text>
        </View>

        <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}>
          {t.credits.mobileSubtitle}
        </Text>

        {/* Rate is region-dependent, so state it plainly rather than only in
            the top-up dialog. */}
        <View
          style={[
            styles.rateBadge,
            {
              backgroundColor: `${colors.primary}12`,
              borderColor: `${colors.primary}33`,
            },
          ]}
        >
          <Text style={[styles.rateText, { color: colors.primary }]}>
            {t.credits.pricePerPointLabel(rate, currency)}
          </Text>
        </View>

        {loading && !summary ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={colors.primary} />
        ) : (
          <PointsPieChart summary={displaySummary} />
        )}

        <View style={[styles.statsRow, { flexDirection: dir }]}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{displaySummary.message_points}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {t.credits.available}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {displaySummary.points_purchased_total}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {t.credits.purchased}
            </Text>
          </View>
        </View>

        {isDoctor ? (
          <Pressable
            onPress={confirmReimburse}
            disabled={reimbursing || displaySummary.message_points <= 0}
            style={({ pressed }) => [
              styles.addBtn,
              {
                backgroundColor: colors.primary,
                opacity:
                  reimbursing || displaySummary.message_points <= 0
                    ? 0.5
                    : pressed
                      ? 0.9
                      : 1,
                flexDirection: dir,
              },
            ]}
          >
            {reimbursing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Wallet size={20} color="#fff" />
                <Text style={styles.addBtnText}>{t.credits.reimburse}</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setModalOpen(true)}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, flexDirection: dir },
            ]}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.addBtnText}>{t.credits.addCredits}</Text>
          </Pressable>
        )}
      </KeyboardSafeScrollView>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalOpen(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t.credits.addCredits}</Text>
            <Text style={[styles.modalHint, { color: colors.mutedForeground, textAlign }]}>
              {t.credits.pricePerPointLabel(rate, currency)}
            </Text>
            <Text style={[styles.modalHint, { color: colors.mutedForeground, textAlign }]}>
              {t.credits.creditAmountHint}
            </Text>
            <AppTextInput
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="number-pad"
              placeholder={t.credits.amountPlaceholder}
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  backgroundColor: colors.muted,
                  color: colors.foreground,
                  textAlign,
                },
              ]}
            />
            {(() => {
              const pts = parseInt(amountText.trim(), 10);
              if (!Number.isFinite(pts) || pts < 1) return null;
              return (
                <Text style={{ color: colors.primary, fontWeight: "800", textAlign, fontSize: 15 }}>
                  {t.credits.checkoutAmount}:{" "}
                  {formatMoney(moneyForAmount(pts), t)}
                </Text>
              );
            })()}
            <View style={[styles.modalActions, { flexDirection: dir }]}>
              <Pressable
                onPress={() => setModalOpen(false)}
                style={[styles.modalBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>{t.common.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                style={[styles.modalBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>{t.credits.continue}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rateBadge: {
    alignSelf: "center",
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  rateText: { fontSize: 13, fontWeight: "800" },
  root: { flex: 1 },
  content: { padding: 20, gap: 16 },
  heading: { alignItems: "center", gap: 10, marginTop: 8 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  statsRow: { gap: 12, marginTop: 8 },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 24, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "600" },
  addBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: { borderRadius: 16, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  modalHint: { fontSize: 13, lineHeight: 18 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  modalActions: { gap: 10, marginTop: 4 },
  modalBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 46,
  },
});
