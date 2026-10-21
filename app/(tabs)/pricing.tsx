import { LinearGradient } from "expo-linear-gradient";
import { Globe2, Stethoscope, Wallet } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { CircledCountryFlag } from "@/components/country/CircledCountryFlag";
import { useAuthStore } from "@/domains/auth/store";
import {
  fetchPointPricing,
  type MarketPrice,
  type PointMarket,
  type PointPricing,
} from "@/domains/points/api";
import { resolvePatientGeoCountry } from "@/domains/patient/geo";
import {
  marketCurrencyCode,
  pricePerPoint,
} from "@/constants/patientCountries";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";

/** The "your region" wash is a fixed light gradient — text on it stays dark. */
const HIGHLIGHT_TEXT = "#1a2132";

const MARKET_ORDER: PointMarket[] = ["EG", "JO", "INTL"];

/** Public pricing page — the per-credit rate in every market we serve. */
export default function PricingTab() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const textAlign = alignText(isRTL);
  const dir = flexRow(isRTL);
  const profile = useAuthStore((s) => s.profile);
  const [pricing, setPricing] = useState<PointPricing | null>(null);
  const [ipCountry, setIpCountry] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const geo = await resolvePatientGeoCountry();
      if (cancelled) return;
      setIpCountry(geo);
      const next = await fetchPointPricing(geo);
      if (cancelled) return;
      if (next) setPricing(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.country]);

  // Until the lookup answers (or if it fails) fall back to the profile market,
  // so the page never renders an empty table.
  const fallback: MarketPrice[] = MARKET_ORDER.map((market) => ({
    market,
    currency: marketCurrencyCode(market === "INTL" ? "XX" : market),
    pricePerPoint: pricePerPoint(market === "INTL" ? "XX" : market),
  }));
  const rows = pricing?.markets?.length ? pricing.markets : fallback;
  // Highlight only what we actually know. `market` alone is not enough: the
  // server resolves an undetected caller to the default market, which would
  // label Egypt as "your region" for everyone.
  const detected = pricing?.detectedCountry ?? ipCountry;
  const profileMarket = profile?.country?.trim().toUpperCase();
  const activeMarket: PointMarket | null = detected
    ? detected === "EG" || detected === "JO"
      ? detected
      : "INTL"
    : profileMarket === "JO" || profileMarket === "EG"
      ? profileMarket
      : null;

  const marketName = (market: PointMarket) =>
    market === "EG"
      ? t.pricing.marketEgypt
      : market === "JO"
        ? t.pricing.marketJordan
        : t.pricing.marketIntl;

  const notes = [
    { Icon: Stethoscope, text: t.pricing.setByDoctor },
    { Icon: Wallet, text: t.pricing.payAsYouGo },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
          {t.pricing.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}>
          {t.pricing.subtitle}
        </Text>

        <View
          style={[
            styles.table,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.headRow,
              { flexDirection: dir, borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.headText, { color: colors.mutedForeground, textAlign }]}>
              {t.pricing.columnRegion}
            </Text>
            <Text style={[styles.headPrice, { color: colors.mutedForeground }]}>
              {t.pricing.columnPrice}
            </Text>
          </View>

          {rows.map((row) => {
            const isYours = row.market === activeMarket;
            // The highlight wash is always light, so its text cannot follow the
            // theme foreground — in dark mode that was white on near-white.
            const rowColor = isYours ? HIGHLIGHT_TEXT : colors.foreground;
            return (
              <View
                key={row.market}
                style={[
                  styles.row,
                  { flexDirection: dir, borderTopColor: colors.border },
                ]}
              >
                {/* Grey wash marks the visitor's own region. */}
                {isYours ? (
                  <LinearGradient
                    colors={["#e9edf3", "#d6dce6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />
                ) : null}
                <View style={[styles.regionCell, { flexDirection: dir }]}>
                  {row.market === "INTL" ? (
                    <View style={[styles.globe, { backgroundColor: `${colors.primary}14` }]}>
                      <Globe2 size={15} color={colors.primary} />
                    </View>
                  ) : (
                    <CircledCountryFlag country={row.market} size={22} />
                  )}
                  <View style={styles.regionText}>
                    <Text style={[styles.region, { color: rowColor, textAlign }]}>
                      {marketName(row.market)}
                    </Text>
                    {isYours ? (
                      <Text
                        style={[styles.yours, { color: HIGHLIGHT_TEXT, textAlign }]}
                      >
                        {t.pricing.yourRegion}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <Text style={[styles.price, { color: rowColor }]}>
                  {row.pricePerPoint} {row.currency}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
          {t.pricing.locationHint}
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {notes.map(({ Icon, text }) => (
            <View key={text} style={[styles.noteRow, { flexDirection: dir }]}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
                <Icon size={18} color={colors.primary} />
              </View>
              <Text style={[styles.noteText, { color: colors.foreground, textAlign }]}>
                {text}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 14 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 22 },
  table: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  headRow: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headText: { flex: 1, fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  headPrice: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  row: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  regionCell: { flex: 1, alignItems: "center", gap: 10, minWidth: 0 },
  regionText: { flex: 1, minWidth: 0 },
  region: { fontSize: 15, fontWeight: "700" },
  yours: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  price: { fontSize: 16, fontWeight: "800" },
  globe: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontSize: 13, lineHeight: 19 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  noteRow: { alignItems: "center", gap: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  noteText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "600" },
});
