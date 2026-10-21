import { usePathname, useRouter } from "expo-router";
import { ArrowLeft, ArrowRight, Coins } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  PaymentMethodCard,
  type PaymentMethodId,
} from "@/components/points/PaymentMethodCard";
import { createVisaCheckout } from "@/domains/points/api";
import { useAuthStore } from "@/domains/auth/store";
import { useIpPointPricing } from "@/hooks/useIpPointPricing";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { canNavigateBack, navigateBack } from "@/utils/appNavigation";
import { formatMoney } from "@/utils/credits";
import { showErrorToast } from "@/utils/toast";
import { flexRow } from "@/utils/rtl";

interface PointsCheckoutViewProps {
  amount: number;
  desktopLayout?: boolean;
}

export function PointsCheckoutView({ amount, desktopLayout = false }: PointsCheckoutViewProps) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isDesktop } = useWebLayout();
  const router = useRouter();
  usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { rate, currency, moneyForAmount, loading: pricingLoading } = useIpPointPricing();
  const [payingMethod, setPayingMethod] = useState<PaymentMethodId | null>(null);
  const useWideLayout = desktopLayout || isDesktop;
  const dir = flexRow(isRTL);
  const textAlign = isRTL ? "right" : "left";
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const showBack = canNavigateBack(router);
  const due = moneyForAmount(amount);

  const methods: Array<{
    id: PaymentMethodId;
    label: string;
    subtitle: string;
  }> = [
    {
      id: "credit_card",
      label: t.credits.creditCard,
      subtitle: t.credits.creditCardHint,
    },
  ];

  const handlePayment = async (method: PaymentMethodId) => {
    if (method !== "credit_card") return;
    if (!accessToken) {
      showErrorToast(t.credits.paymentFailed, t.credits.paymentFailedHint);
      return;
    }
    setPayingMethod(method);
    try {
      const { checkout_url } = await createVisaCheckout(accessToken, amount);
      if (Platform.OS === "web") {
        window.location.assign(checkout_url);
        return;
      }
      const canOpen = await Linking.canOpenURL(checkout_url);
      if (!canOpen) {
        throw new Error(t.credits.paymentFailedHint);
      }
      await Linking.openURL(checkout_url);
    } catch (error) {
      showErrorToast(
        t.credits.paymentFailed,
        error instanceof Error ? error.message : t.credits.paymentFailedHint,
      );
    } finally {
      setPayingMethod(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        nativeID={BRAND_SCROLL_NATIVE_ID}
        contentContainerStyle={[
          styles.scroll,
          useWideLayout && styles.scrollDesktop,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <View
          style={[
            styles.container,
            { maxWidth: useWideLayout ? WEB_MAX_WIDTH.content : 560 },
          ]}
        >
          {showBack ? (
            <Pressable
              onPress={() => navigateBack(router, "/(tabs)/points")}
              style={[styles.backRow, { flexDirection: dir }]}
            >
              <BackIcon size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "700" }}>{t.credits.back}</Text>
            </Pressable>
          ) : null}

          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.summaryHeader, { flexDirection: dir }]}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
                <Coins size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryTitle, { color: colors.foreground, textAlign }]}>
                  {t.credits.checkoutTitle}
                </Text>
                <Text style={{ color: colors.mutedForeground, textAlign }}>
                  {pricingLoading ? "…" : t.credits.pricePerPointLabel(rate, currency)}
                </Text>
              </View>
            </View>
            <View style={[styles.amountRow, { borderTopColor: colors.border }]}>
              <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
                {t.credits.checkoutPoints}
              </Text>
              <Text style={[styles.pointsValue, { color: colors.foreground }]}>
                {amount}
              </Text>
            </View>
            <View style={[styles.amountRow, { borderTopColor: colors.border, borderTopWidth: 0, paddingTop: 8 }]}>
              <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
                {t.credits.checkoutAmount}
              </Text>
              <Text style={[styles.amountValue, { color: colors.primary }]}>
                {formatMoney(due, t)}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>
            {t.credits.paymentMethod}
          </Text>

          <View style={styles.methods}>
            {methods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                id={method.id}
                label={method.label}
                subtitle={method.subtitle}
                disabled={payingMethod !== null}
                loading={payingMethod === method.id}
                onPress={() => void handlePayment(method.id)}
              />
            ))}
          </View>

          {payingMethod ? (
            <View style={[styles.loadingRow, { flexDirection: dir }]}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.mutedForeground }}>
                {t.credits.openingPayment}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  scroll: {
    padding: 20,
    alignItems: "center",
    flexGrow: 1,
  },
  scrollDesktop: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 48,
  },
  container: {
    width: "100%",
    gap: 20,
  },
  backRow: {
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 22,
    gap: 16,
  },
  summaryHeader: {
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 14,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: "900",
  },
  pointsValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  methods: {
    gap: 14,
  },
  loadingRow: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
  },
});
