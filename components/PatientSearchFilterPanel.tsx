import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import {
  EMPTY_PATIENT_FILTERS,
  hasActivePatientFilters,
  type PatientSearchFilters,
} from "@/domains/patients/search";
import { useColors } from "@/hooks/useColors";
import { alignText } from "@/utils/rtl";

export function PatientSearchFilterPanel({
  filters,
  onChange,
  isRTL,
  dir,
}: {
  filters: PatientSearchFilters;
  onChange: (f: PatientSearchFilters) => void;
  isRTL: boolean;
  dir: "row" | "row-reverse";
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const active = hasActivePatientFilters(filters);
  const textAlign = alignText(isRTL);

  const collapsedSummary = active
    ? `"${filters.text.trim()}"`
    : isRTL
      ? "ابحث بالاسم أو الهاتف أو البريد"
      : "Search by name, phone, or email";

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.filterPanel,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={[styles.panelHeader, { flexDirection: dir }]}>
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={[styles.headerLeft, { flexDirection: dir }]}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <SlidersHorizontal size={18} color={active ? colors.primary : colors.mutedForeground} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.panelTitle, { color: colors.foreground, textAlign }]}>
              {isRTL ? "بحث المرضى" : "Search patients"}
            </Text>
            {!expanded && (
              <Text
                style={[styles.collapsedHint, { color: colors.mutedForeground, textAlign }]}
                numberOfLines={1}
              >
                {collapsedSummary}
              </Text>
            )}
          </View>
          {active && !expanded && (
            <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
          )}
        </Pressable>
        {active && !expanded && (
          <Pressable onPress={() => onChange(EMPTY_PATIENT_FILTERS)} hitSlop={8}>
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
        <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8}>
          {expanded ? (
            <ChevronUp size={18} color={colors.mutedForeground} />
          ) : (
            <ChevronDown size={18} color={colors.mutedForeground} />
          )}
        </Pressable>
      </View>

      {expanded && (
        <>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, textAlign }]}>
            {isRTL ? "الاسم · الهاتف · البريد" : "Name · phone · email"}
          </Text>
          <View
            style={[
              styles.textRow,
              { flexDirection: dir, borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <Search size={16} color={colors.mutedForeground} />
            <AppTextInput
              value={filters.text}
              onChangeText={(text) => onChange({ ...filters, text })}
              placeholder={
                isRTL ? "مثال: أحمد، 010…، email@…" : "e.g. Ahmed, 010…, email@…"
              }
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.textInput,
                { color: colors.foreground, textAlign },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="default"
              returnKeyType="search"
            />
            {filters.text.length > 0 && (
              <Pressable onPress={() => onChange(EMPTY_PATIENT_FILTERS)} hitSlop={8}>
                <X size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {active && (
            <Pressable
              onPress={() => onChange(EMPTY_PATIENT_FILTERS)}
              style={[styles.clearAllRow, { borderColor: colors.border }]}
            >
              <Text style={[styles.clearAll, { color: colors.primary }]}>
                {isRTL ? "مسح البحث" : "Clear search"}
              </Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  panelHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  headerLeft: { flex: 1, alignItems: "center", gap: 10 },
  panelTitle: { fontSize: 15, fontWeight: "800" },
  collapsedHint: { fontSize: 12, fontWeight: "500" },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6, marginTop: 10 },
  textRow: {
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInput: { flex: 1, fontSize: 14, paddingVertical: 2 },
  clearAll: { fontSize: 13, fontWeight: "700" },
  clearAllRow: {
    marginTop: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
});
