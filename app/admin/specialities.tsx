import { Check } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  fetchAdminSpecialities,
  updateSpecialityVisibility,
  type AdminSpecialityRow,
} from "@/domains/admin/api";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

type MarketKey = "visible_eg" | "visible_jo";

export default function AdminSpecialitiesWeb() {
  const colors = useColors();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [rows, setRows] = useState<AdminSpecialityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setRows(await fetchAdminSpecialities(accessToken));
    } catch (e) {
      showErrorToast("Failed to load specialities", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (row: AdminSpecialityRow, key: MarketKey) => {
    if (!accessToken || savingId) return;
    const next = !row[key];
    setSavingId(row.id);
    // Optimistic update
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, [key]: next } : r)),
    );
    try {
      const saved = await updateSpecialityVisibility(accessToken, row.id, {
        [key]: next,
      });
      setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      showSuccessToast(
        next
          ? `Visible in ${key === "visible_eg" ? "Egypt" : "Jordan"}`
          : `Hidden in ${key === "visible_eg" ? "Egypt" : "Jordan"}`,
      );
    } catch (e) {
      // Revert
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, [key]: row[key] } : r)),
      );
      showErrorToast("Could not update visibility", (e as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminShell
      title="Specialities"
      subtitle="Choose which specialities appear on the Egypt and Jordan markets."
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.panel,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.headRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headSpeciality, { color: colors.mutedForeground }]}>
              Speciality
            </Text>
            <Text style={[styles.headMarket, { color: colors.mutedForeground }]}>
              Egypt
            </Text>
            <Text style={[styles.headMarket, { color: colors.mutedForeground }]}>
              Jordan
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginVertical: 32 }}
            />
          ) : rows.length === 0 ? (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              No specialities found.
            </Text>
          ) : (
            rows.map((row) => {
              const busy = savingId === row.id;
              return (
                <View
                  key={row.id}
                  style={[styles.row, { borderBottomColor: colors.border }]}
                >
                  <View style={styles.specCell}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={[styles.specName, { color: colors.foreground }]}
                      >
                        {row.name_en}
                      </Text>
                      <Text
                        style={[styles.specAr, { color: colors.mutedForeground }]}
                      >
                        {row.name_ar}
                      </Text>
                    </View>
                  </View>

                  <Checkbox
                    checked={row.visible_eg}
                    disabled={busy}
                    colors={colors}
                    label="Egypt"
                    onPress={() => void toggle(row, "visible_eg")}
                  />
                  <Checkbox
                    checked={row.visible_jo}
                    disabled={busy}
                    colors={colors}
                    label="Jordan"
                    onPress={() => void toggle(row, "visible_jo")}
                  />
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </AdminShell>
  );
}

function Checkbox({
  checked,
  disabled,
  colors,
  label,
  onPress,
}: {
  checked: boolean;
  disabled?: boolean;
  colors: ReturnType<typeof useColors>;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={`${label} visible`}
      style={({ pressed }) => [
        styles.checkWrap,
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: checked ? colors.primary : colors.border,
            backgroundColor: checked ? colors.primary : colors.background,
          },
        ]}
      >
        {checked ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: 28,
    paddingBottom: 48,
    maxWidth: 860,
    width: "100%",
    alignSelf: "center",
  },
  panel: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(15, 118, 110,0.04)",
  },
  headSpeciality: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  headMarket: {
    width: 88,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  empty: {
    padding: 28,
    textAlign: "center",
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  specCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  specName: { fontSize: 15, fontWeight: "700" },
  specAr: { fontSize: 13 },
  checkWrap: {
    width: 88,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    cursor: "pointer" as "auto",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
