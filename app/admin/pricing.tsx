import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  fetchAdminPointPricing,
  updatePointPrice,
  type AdminPointMarket,
  type AdminPointPricingRow,
} from "@/domains/admin/api";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

const MARKET_LABEL: Record<AdminPointMarket, string> = {
  EG: "Egypt",
  JO: "Jordan",
  INTL: "Rest of the world",
};

export default function AdminPricingWeb() {
  const colors = useColors();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [rows, setRows] = useState<AdminPointPricingRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingMarket, setSavingMarket] = useState<AdminPointMarket | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const next = await fetchAdminPointPricing(accessToken);
      setRows(next);
      setDrafts(
        Object.fromEntries(next.map((r) => [r.market, String(r.pricePerPoint)])),
      );
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : "Failed to load pricing");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (row: AdminPointPricingRow) => {
    if (!accessToken || savingMarket) return;
    const price = Number(drafts[row.market]);
    if (!Number.isFinite(price) || price <= 0) {
      showErrorToast("Price must be a number greater than zero");
      return;
    }
    setSavingMarket(row.market);
    try {
      const saved = await updatePointPrice(accessToken, row.market, price);
      setRows((current) =>
        current.map((r) => (r.market === saved.market ? saved : r)),
      );
      showSuccessToast(`${MARKET_LABEL[row.market]} updated`);
    } catch (e) {
      showErrorToast(e instanceof Error ? e.message : "Could not save price");
    } finally {
      setSavingMarket(null);
    }
  };

  return (
    <AdminShell
      title="Credit pricing"
      subtitle="Cash charged for one credit in each market. Patients see the price for their own location; doctors set how many credits a consultation costs."
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {rows.map((row) => {
            const dirty = drafts[row.market] !== String(row.pricePerPoint);
            const busy = savingMarket === row.market;
            return (
              <View
                key={row.market}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.cardHead}>
                  <Text style={[styles.market, { color: colors.foreground }]}>
                    {MARKET_LABEL[row.market]}
                  </Text>
                  <Text style={[styles.current, { color: colors.mutedForeground }]}>
                    Currently 1 credit = {row.pricePerPoint} {row.currency}
                  </Text>
                </View>

                <View style={styles.editRow}>
                  <AppTextInput
                    value={drafts[row.market] ?? ""}
                    onChangeText={(value) =>
                      setDrafts((prev) => ({ ...prev, [row.market]: value }))
                    }
                    keyboardType="decimal-pad"
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                  />
                  <Text style={[styles.currency, { color: colors.mutedForeground }]}>
                    {row.currency}
                  </Text>
                  <Pressable
                    onPress={() => void save(row)}
                    disabled={!dirty || busy}
                    style={[
                      styles.saveBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity: !dirty || busy ? 0.45 : 1,
                      },
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveText}>Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 14, paddingBottom: 32 },
  card: { borderRadius: 14, borderWidth: 1, padding: 18, gap: 14 },
  cardHead: { gap: 4 },
  market: { fontSize: 17, fontWeight: "800" },
  current: { fontSize: 13 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: {
    width: 140,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  currency: { fontSize: 14, fontWeight: "700", minWidth: 40 },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    minWidth: 92,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
