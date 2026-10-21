import { Trash2, UserRound, Stethoscope } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_MOBILE_MAX_WIDTH, adminPagePadding } from "@/constants/adminLayout";
import { patientCountryLabel } from "@/constants/patientCountries";
import {
  fetchAdminDeletedAccounts,
  type AdminDeletedAccountRow,
} from "@/domains/admin/api";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { showErrorToast } from "@/utils/toast";

type Tab = "all" | "doctor" | "patient";

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminDeletedAccountsWeb() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const compact = width <= ADMIN_MOBILE_MAX_WIDTH;
  const pagePadding = adminPagePadding(compact);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [items, setItems] = useState<AdminDeletedAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setItems(await fetchAdminDeletedAccounts(accessToken));
    } catch (e) {
      showErrorToast("Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    return items.filter((row) => row.account_type === tab);
  }, [items, tab]);

  const doctorCount = items.filter((r) => r.account_type === "doctor").length;
  const patientCount = items.filter((r) => r.account_type === "patient").length;

  return (
    <AdminShell
      title="Deleted accounts"
      subtitle="Archived patients and doctors after account deletion. Medical data is permanently removed."
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.tabs,
          { borderBottomColor: colors.border, paddingHorizontal: pagePadding },
        ]}
      >
        {(
          [
            { key: "all" as Tab, label: `All (${items.length})` },
            { key: "doctor" as Tab, label: `Doctors (${doctorCount})` },
            { key: "patient" as Tab, label: `Patients (${patientCount})` },
          ] as const
        ).map((entry) => {
          const active = tab === entry.key;
          return (
            <Pressable
              key={entry.key}
              onPress={() => setTab(entry.key)}
              style={[
                styles.tab,
                active && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={{
                  color: active ? colors.primary : colors.mutedForeground,
                  fontWeight: active ? "800" : "600",
                  fontSize: 14,
                }}
              >
                {entry.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={[styles.content, { padding: pagePadding }]}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : filtered.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, marginTop: 24 }}>
            No deleted accounts in this category.
          </Text>
        ) : (
          filtered.map((row) => (
            <View
              key={row.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.cardHead}>
                {row.account_type === "doctor" ? (
                  <Stethoscope size={18} color={colors.primary} />
                ) : (
                  <UserRound size={18} color={colors.primary} />
                )}
                <Text style={[styles.name, { color: colors.foreground }]}>{row.name}</Text>
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor:
                        row.account_type === "doctor"
                          ? `${colors.primary}18`
                          : `${colors.mutedForeground}18`,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: row.account_type === "doctor" ? colors.primary : colors.mutedForeground,
                      fontSize: 11,
                      fontWeight: "700",
                      textTransform: "capitalize",
                    }}
                  >
                    {row.account_type}
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{row.email}</Text>
              {row.phone ? (
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{row.phone}</Text>
              ) : null}
              {row.country ? (
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  {patientCountryLabel(row.country, false)}
                </Text>
              ) : null}
              {row.speciality_name ? (
                <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>
                  {row.speciality_name}
                </Text>
              ) : null}
              <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6 }}>
                Deleted {fmt(row.deleted_at)}
                {" · "}
                {row.deleted_by === "self" ? "By user" : "By admin"}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    gap: 20,
    paddingTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    paddingBottom: 12,
    paddingTop: 4,
    paddingHorizontal: 4,
  },
  content: { gap: 12, paddingBottom: 40 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  name: { fontSize: 16, fontWeight: "800", flex: 1 },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
