import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useAuthStore } from "@/domains/auth/store";
import { usePointsStore } from "@/domains/points/store";
import { DEFAULT_AVAILABLE_POINTS } from "@/domains/points/api";
import { useI18n } from "@/hooks/useI18n";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

const EMPTY_SUMMARY = {
  message_points: DEFAULT_AVAILABLE_POINTS,
  points_spent_total: 0,
  points_purchased_total: 0,
};

export function usePointsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { payment: rawPayment } = useLocalSearchParams<{ payment?: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const summary = usePointsStore((s) => s.summary);
  const loading = usePointsStore((s) => s.loading);
  const loadPoints = usePointsStore((s) => s.loadPoints);

  const [amountText, setAmountText] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!accessToken) return;
      void loadPoints(accessToken);

      const payment = Array.isArray(rawPayment) ? rawPayment[0] : rawPayment;
      if (payment === "success") {
        showSuccessToast(t.credits.paymentSuccess, t.credits.paymentSuccessHint);
        router.setParams({ payment: undefined });
      } else if (payment === "failed") {
        showErrorToast(t.credits.paymentFailed, t.credits.paymentFailedHint);
        router.setParams({ payment: undefined });
      }
    }, [accessToken, loadPoints, rawPayment, router, t.credits]),
  );

  const displaySummary = summary ?? EMPTY_SUMMARY;

  const parseAmount = (rawAmount?: number): number | null => {
    const amount = rawAmount ?? parseInt(amountText.trim(), 10);
    if (!Number.isFinite(amount) || amount < 1) {
      showErrorToast(t.credits.invalidAmount, t.credits.invalidAmountHint);
      return null;
    }
    return amount;
  };

  return {
    accessToken,
    summary,
    loading,
    displaySummary,
    amountText,
    setAmountText,
    parseAmount,
    t,
  };
}
