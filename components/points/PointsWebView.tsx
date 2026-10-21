import { Coins, Plus, TrendingDown, TrendingUp, Wallet, Zap } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";

import { router } from "expo-router";
import { PointsPieChart } from "@/components/PointsPieChart";
import { useIpPointPricing } from "@/hooks/useIpPointPricing";
import { WEB_MAX_WIDTH } from "@/constants/webLayout";
import { BRAND_SCROLL_NATIVE_ID } from "@/components/web/globalWebStyles";
import { useColors } from "@/hooks/useColors";
import { useMobileWebPageTitlePaddingTop } from "@/hooks/useMobileWebPageTitlePaddingTop";
import { useI18n } from "@/hooks/useI18n";
import { usePointsPage } from "@/hooks/usePointsPage";
import { useWebLayout } from "@/hooks/useWebLayout";
import { useAuthStore } from "@/domains/auth/store";
import { usePointsStore } from "@/domains/points/store";
import { reimbursePoints } from "@/domains/points/api";
import { formatMoney } from "@/utils/credits";
import { webConfirm } from "@/utils/webConfirm";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import type { Translations } from "@/constants/translations";
import { flexRow } from "@/utils/rtl";

function gridColumns(isWide: boolean, isDesktop: boolean, isTablet: boolean) {
  if (isWide) return 3;
  if (isDesktop || isTablet) return 2;
  return 1;
}

function gridStyle(columns: number): ViewStyle {
  if (columns === 1) {
    return { flexDirection: "column", gap: 16 };
  }
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: 20,
  } as unknown as ViewStyle;
}

function SectionLabel({
  children,
  textAlign,
  color,
}: {
  children: string;
  textAlign: "left" | "right";
  color: string;
}) {
  return (
    <Text style={[styles.sectionLabel, { color, textAlign }]}>{children}</Text>
  );
}

function DashboardCard({
  testID,
  style,
  children,
}: {
  testID: string;
  style?: ViewStyle | (ViewStyle | undefined | false)[];
  children: React.ReactNode;
}) {
  return (
    <View testID={testID} style={[styles.dashboardCard, style]}>
      {children}
    </View>
  );
}

function AddPointsForm({
  amountText,
  setAmountText,
  parseAmount,
  colors,
  t,
  isRTL,
  useSplitLayout,
  onSubmitted,
}: {
  amountText: string;
  setAmountText: (value: string) => void;
  parseAmount: () => number | null;
  colors: ReturnType<typeof useColors>;
  t: Translations;
  isRTL: boolean;
  useSplitLayout: boolean;
  onSubmitted?: () => void;
}) {
  const dir = flexRow(isRTL);
  const textAlign = isRTL ? "right" : "left";
  const { rate, currency, moneyForAmount } = useIpPointPricing();
  const ptsPreview = parseInt(amountText.trim(), 10);
  const duePreview =
    Number.isFinite(ptsPreview) && ptsPreview >= 1
      ? moneyForAmount(ptsPreview)
      : null;

  const handleContinue = () => {
    const amount = parseAmount();
    if (!amount) return;
    onSubmitted?.();
    router.push(`/points/checkout?amount=${amount}`);
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.addCardIntro}>
        <Text style={[styles.addCardHint, { color: colors.mutedForeground, textAlign }]}>
          {t.credits.pricePerPointLabel(rate, currency)}
        </Text>
        <Text style={[styles.addCardHint, { color: colors.mutedForeground, textAlign }]}>
          {t.credits.creditAmountHint}
        </Text>
      </View>

      <View
        style={[
          styles.addCardFormWrap,
          useSplitLayout && [styles.addCardInnerSplit, { flexDirection: dir }],
        ]}
      >
        <View style={[styles.addCardForm, useSplitLayout && styles.addCardFormSplit]}>
        <View style={styles.addFieldBlock}>
          <Text style={[styles.addFieldLabel, { color: colors.foreground, textAlign }]}>
            {t.credits.creditAmount}
          </Text>
          <AppTextInput
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="number-pad"
            placeholder={t.credits.amountPlaceholder}
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.addInput,
              {
                borderColor: colors.border,
                color: colors.foreground,
                backgroundColor: colors.background,
                textAlign,
              },
            ]}
          />
          {duePreview != null ? (
            <Text style={{ color: colors.primary, fontWeight: "800", textAlign, marginTop: 8 }}>
              {t.credits.checkoutAmount}: {formatMoney(duePreview, t)}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={handleContinue}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.addSubmitBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.92 : hovered ? 0.96 : 1,
              flexDirection: dir,
            },
          ]}
        >
          <Plus size={18} color="#fff" />
          <Text style={styles.addSubmitText}>
            {t.credits.continueCheckout}
          </Text>
        </Pressable>
        </View>
      </View>
    </View>
  );
}

function AddPointsCard({
  amountText,
  setAmountText,
  parseAmount,
  colors,
  t,
  isRTL,
  useSplitLayout,
}: {
  amountText: string;
  setAmountText: (value: string) => void;
  parseAmount: () => number | null;
  colors: ReturnType<typeof useColors>;
  t: Translations;
  isRTL: boolean;
  useSplitLayout: boolean;
}) {
  const dir = flexRow(isRTL);
  const textAlign = isRTL ? "right" : "left";

  return (
    <DashboardCard
      testID="points-add-card"
      style={[
        styles.addCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.addCardInner}>
        <View style={[styles.addCardTitleRow, { flexDirection: dir }]}>
          <View style={[styles.addCardIcon, { backgroundColor: `${colors.primary}14` }]}>
            <Plus size={18} color={colors.primary} />
          </View>
          <Text style={[styles.addCardTitle, { color: colors.foreground, textAlign }]}>
            {t.credits.addCredits}
          </Text>
        </View>
        <AddPointsForm
          amountText={amountText}
          setAmountText={setAmountText}
          parseAmount={parseAmount}
          colors={colors}
          t={t}
          isRTL={isRTL}
          useSplitLayout={useSplitLayout}
        />
      </View>
    </DashboardCard>
  );
}

export function PointsWebView() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const { isWide, isDesktop, isTablet, isMobile } = useWebLayout();
  const mobileTitlePaddingTop = useMobileWebPageTitlePaddingTop();
  const columns = gridColumns(isWide, isDesktop, isTablet);
  const useSplitLayout = isDesktop || isTablet;
  const dir = flexRow(isRTL);
  const textAlign = isRTL ? "right" : "left";
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [reimbursing, setReimbursing] = useState(false);
  const role = useAuthStore((s) => s.role);
  const accessToken = useAuthStore((s) => s.accessToken);
  const loadPoints = usePointsStore((s) => s.loadPoints);
  const isDoctor = role?.toLowerCase() === "doctor";

  const {
    loading,
    displaySummary,
    summary,
    amountText,
    setAmountText,
    parseAmount,
    t,
  } = usePointsPage();

  const handleReimburse = async () => {
    if (!accessToken || displaySummary.message_points <= 0) return;
    const ok = webConfirm(
      t.credits.reimburse,
      t.credits.reimburseConfirm(displaySummary.message_points),
    );
    if (!ok) return;
    setReimbursing(true);
    try {
      await reimbursePoints(accessToken);
      await loadPoints(accessToken);
      showSuccessToast(t.credits.reimbursementRequested);
    } catch (e) {
      showErrorToast(t.credits.reimburseFailed, (e as Error).message);
    } finally {
      setReimbursing(false);
    }
  };

  const chartSize = isWide ? 280 : isDesktop ? 252 : 220;
  const containerGap = useSplitLayout ? 28 : 20;

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView
        nativeID={BRAND_SCROLL_NATIVE_ID}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          useSplitLayout && styles.scrollContentDesktop,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <View
          style={[
            styles.container,
            { maxWidth: WEB_MAX_WIDTH.wide, gap: containerGap },
          ]}
        >
          <View
            style={[
              styles.pageHeader,
              useSplitLayout && styles.pageHeaderDesktop,
              mobileTitlePaddingTop > 0 && { paddingTop: mobileTitlePaddingTop },
              { borderBottomColor: colors.border },
            ]}
          >
            <View style={[styles.titleRow, { flexDirection: dir }]}>
              <View style={[styles.titleIcon, { backgroundColor: `${colors.primary}14` }]}>
                <Coins size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.pageTitle, { color: colors.foreground, textAlign }]}>
                  {t.credits.title}
                </Text>
                <Text style={[styles.pageSubtitle, { color: colors.mutedForeground, textAlign }]}>
                  {t.credits.subtitle}
                </Text>
              </View>
            </View>
          </View>

          {loading && !summary ? (
            <ActivityIndicator style={{ marginTop: 64 }} color={colors.primary} />
          ) : (
            <>
              <View style={styles.sectionBlock}>
                <SectionLabel
                  textAlign={textAlign}
                  color={colors.mutedForeground}
                >
                  {t.credits.overview}
                </SectionLabel>
                <View
                  style={[
                    styles.topRow,
                    useSplitLayout && [styles.topRowSplit, { flexDirection: dir }],
                  ]}
                >
                  <DashboardCard
                    testID="points-balance-card"
                    style={[
                      styles.balanceCard,
                      useSplitLayout ? styles.balanceCardSplit : undefined,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        ...(isRTL
                          ? { borderRightWidth: 4, borderRightColor: colors.primary }
                          : { borderLeftWidth: 4, borderLeftColor: colors.primary }),
                      },
                    ]}
                  >
                    <Text
                      style={[styles.balanceEyebrow, { color: colors.mutedForeground, textAlign }]}
                    >
                      {t.credits.currentBalance}
                    </Text>
                    <Text
                      style={[
                        styles.balanceValue,
                        isWide && styles.balanceValueWide,
                        { color: colors.primary, textAlign },
                      ]}
                    >
                      {displaySummary.message_points}
                    </Text>
                    <Text style={[styles.balanceUnit, { color: colors.foreground, textAlign }]}>
                      {t.credits.availableForMessages}
                    </Text>
                    <View style={[styles.balanceMeta, { flexDirection: dir }]}>
                      <View style={[styles.metaPill, { backgroundColor: `${colors.primary}10` }]}>
                        <Zap size={14} color={colors.primary} />
                        <Text style={[styles.metaPillText, { color: colors.primary }]}>
                          {t.credits.perAiMessage}
                        </Text>
                      </View>
                    </View>
                  </DashboardCard>

                  <DashboardCard
                    testID="points-chart-card"
                    style={[
                      styles.chartCard,
                      useSplitLayout ? styles.chartCardSplit : undefined,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.cardTitle, { color: colors.foreground, textAlign }]}>
                      {t.credits.usageBreakdown}
                    </Text>
                    <PointsPieChart summary={displaySummary} size={chartSize} />
                  </DashboardCard>
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <SectionLabel textAlign={textAlign} color={colors.mutedForeground}>
                  {t.credits.activitySummary}
                </SectionLabel>
                <View style={isMobile ? [styles.statsRowMobile, { flexDirection: dir }] : gridStyle(columns)}>
                  <StatCard
                    testID="points-stat-card"
                    icon={TrendingUp}
                    label={t.credits.totalPurchased}
                    value={displaySummary.points_purchased_total}
                    accent={colors.foreground}
                    colors={colors}
                    isRTL={isRTL}
                    isWide={isWide}
                    compact={isMobile}
                  />
                  <StatCard
                    testID="points-stat-card"
                    icon={TrendingDown}
                    label={t.credits.totalUsed}
                    value={displaySummary.points_spent_total}
                    accent={colors.mutedForeground}
                    colors={colors}
                    isRTL={isRTL}
                    isWide={isWide}
                    compact={isMobile}
                  />
                  <StatCard
                    testID="points-stat-card"
                    icon={Zap}
                    label={t.credits.perAiMessageLabel}
                    value={1}
                    suffix={t.credits.currencySuffix}
                    accent={colors.primary}
                    colors={colors}
                    isRTL={isRTL}
                    isWide={isWide}
                    compact={isMobile}
                  />
                </View>
              </View>

              {isDoctor ? (
                <Pressable
                  testID="points-reimburse"
                  onPress={() => void handleReimburse()}
                  disabled={reimbursing || displaySummary.message_points <= 0}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.addBtnMobile,
                    {
                      backgroundColor: colors.primary,
                      opacity:
                        reimbursing || displaySummary.message_points <= 0
                          ? 0.5
                          : pressed
                            ? 0.92
                            : hovered
                              ? 0.96
                              : 1,
                      flexDirection: dir,
                    },
                  ]}
                >
                  <Wallet size={20} color="#fff" />
                  <Text style={styles.addBtnMobileText}>
                    {t.credits.reimburse}
                  </Text>
                </Pressable>
              ) : isMobile ? (
                <Pressable
                  testID="points-add-open"
                  onPress={() => setAddModalOpen(true)}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.addBtnMobile,
                    {
                      backgroundColor: colors.primary,
                      opacity: pressed ? 0.92 : hovered ? 0.96 : 1,
                      flexDirection: dir,
                    },
                  ]}
                >
                  <Plus size={20} color="#fff" />
                  <Text style={styles.addBtnMobileText}>
                    {t.credits.addCredits}
                  </Text>
                </Pressable>
              ) : (
                <View style={[styles.sectionBlock, styles.addSectionBlock]}>
                  <SectionLabel textAlign={textAlign} color={colors.mutedForeground}>
                    {t.credits.addCredits}
                  </SectionLabel>
                  <AddPointsCard
                    amountText={amountText}
                    setAmountText={setAmountText}
                    parseAmount={parseAmount}
                    colors={colors}
                    isRTL={isRTL}
                    useSplitLayout={useSplitLayout}
                    t={t}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {isMobile ? (
        <Modal
          visible={addModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setAddModalOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setAddModalOpen(false)}>
            <Pressable
              style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={(event) => event.stopPropagation()}
            >
              <Text style={[styles.modalTitle, { color: colors.foreground, textAlign }]}>
                {t.credits.addCredits}
              </Text>
              <AddPointsForm
                amountText={amountText}
                setAmountText={setAmountText}
                parseAmount={parseAmount}
                colors={colors}
                isRTL={isRTL}
                useSplitLayout={false}
                t={t}
                onSubmitted={() => setAddModalOpen(false)}
              />
              <Pressable
                onPress={() => setAddModalOpen(false)}
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                  {t.common.cancel}
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

function StatCard({
  testID,
  icon: Icon,
  label,
  value,
  suffix,
  accent,
  colors,
  isRTL,
  isWide,
  compact = false,
}: {
  testID: string;
  icon: typeof Coins;
  label: string;
  value: number;
  suffix?: string;
  accent: string;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
  isWide: boolean;
  compact?: boolean;
}) {
  const dir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";

  if (compact) {
    return (
      <View
        testID={testID}
        style={[
          styles.dashboardCard,
          styles.statCardCompact,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.statLabelCompact, { color: colors.mutedForeground, textAlign: "center" }]}>
          {label}
        </Text>
        <Text style={[styles.statValueCompact, { color: accent, textAlign: "center" }]}>
          {value}
          {suffix ? ` ${suffix}` : ""}
        </Text>
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.dashboardCard,
        styles.statCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.statTop, { flexDirection: dir }]}>
        <View style={[styles.statIconWrap, { backgroundColor: `${accent}14` }]}>
          <Icon size={16} color={accent} />
        </View>
        <Text
          style={[styles.statLabel, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.statValue,
          isWide && styles.statValueWide,
          { color: accent, textAlign: isRTL ? "right" : "left" },
        ]}
      >
        {value}
        {suffix ? ` ${suffix}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
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
  container: {
    width: "100%",
  },
  pageHeader: {
    paddingHorizontal: 4,
    paddingBottom: 20,
  },
  pageHeaderDesktop: {
    paddingBottom: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  titleRow: {
    alignItems: "flex-start",
    gap: 16,
  },
  titleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
  },
  pageSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    maxWidth: 720,
  },
  sectionBlock: {
    gap: 16,
  },
  addSectionBlock: {
    marginTop: 8,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 4,
  },
  topRow: {
    gap: 20,
  },
  topRowSplit: {
    alignItems: "stretch",
  },
  dashboardCard: {
    borderWidth: 1,
    borderRadius: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  balanceCard: {
    padding: 28,
    gap: 8,
  },
  balanceCardSplit: {
    flex: 1.15,
    minWidth: 320,
  },
  balanceEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  balanceValue: {
    fontSize: 52,
    fontWeight: "800",
    lineHeight: 58,
    marginTop: 6,
  },
  balanceValueWide: {
    fontSize: 64,
    lineHeight: 70,
  },
  balanceUnit: {
    fontSize: 16,
    fontWeight: "600",
  },
  balanceMeta: {
    marginTop: 16,
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  chartCard: {
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  chartCardSplit: {
    flex: 0.85,
    minWidth: 300,
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    alignSelf: "stretch",
    marginBottom: 4,
  },
  statCard: {
    padding: 20,
    gap: 12,
  },
  statTop: {
    alignItems: "center",
    gap: 10,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  statValue: {
    fontSize: 30,
    fontWeight: "800",
  },
  statValueWide: {
    fontSize: 34,
  },
  statsRowMobile: {
    gap: 8,
  },
  statCardCompact: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabelCompact: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 13,
  },
  statValueCompact: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
  },
  addBtnMobile: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    cursor: "pointer" as "auto",
  },
  addBtnMobileText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  modalCancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 46,
    cursor: "pointer" as "auto",
  },
  addCard: {
    padding: 0,
    overflow: "hidden",
  },
  addCardInner: {
    padding: 28,
    gap: 24,
  },
  addCardInnerSplit: {
    alignItems: "stretch",
    gap: 32,
  },
  addCardIntro: {
    flex: 1,
    gap: 16,
    minWidth: 0,
  },
  addCardTitleRow: {
    alignItems: "center",
    gap: 12,
  },
  addCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addCardTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
  },
  addCardHint: {
    fontSize: 15,
    lineHeight: 22,
  },
  quickAmountRow: {
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  quickAmountChip: {
    minWidth: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer" as "auto",
  },
  addCardForm: {
    gap: 16,
  },
  addCardFormWrap: {
    gap: 24,
  },
  addCardFormSplit: {
    flex: 1,
    minWidth: 280,
    maxWidth: 360,
    justifyContent: "center",
  },
  addFieldBlock: {
    gap: 8,
  },
  addFieldLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  addInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: "700",
    minHeight: 52,
  },
  addSubmitBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer" as "auto",
  },
  addSubmitText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});
