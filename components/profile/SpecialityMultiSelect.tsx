import { ChevronDown, Search, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import type { Speciality } from "@/domains/home/api";
import { specialityLabel } from "@/domains/home/specialityLabel";
import type { Locale } from "@/domains/i18n/store";
import type { useColors } from "@/hooks/useColors";
import { alignText, flexRow } from "@/utils/rtl";

/** Results shown at once — enough to pick from without an inner scroll view. */
const MAX_RESULTS = 6;

export function SpecialityMultiSelect({
  specialities,
  selectedIds,
  onToggle,
  isRTL,
  locale,
  colors,
}: {
  specialities: Speciality[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  isRTL: boolean;
  locale: Locale;
  colors: ReturnType<typeof useColors>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => specialities.find((s) => s.id === id))
        .filter((s): s is Speciality => !!s),
    [selectedIds, specialities],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return specialities
      .filter((s) => !selectedIds.includes(s.id))
      .filter(
        (s) =>
          !q ||
          specialityLabel(s, locale).toLowerCase().includes(q) ||
          s.nameEn.toLowerCase().includes(q) ||
          s.nameAr.includes(query.trim()),
      )
      .slice(0, MAX_RESULTS);
  }, [specialities, selectedIds, query, locale]);

  const cancelScheduledClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelScheduledClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  }, [cancelScheduledClose]);

  useEffect(() => cancelScheduledClose, [cancelScheduledClose]);

  return (
    <View style={styles.wrap}>
      {selected.length ? (
        <View style={[styles.chips, { flexDirection: dir }]}>
          {selected.map((spec, index) => (
            <Pressable
              key={spec.id}
              onPress={() => onToggle(spec.id)}
              style={[
                styles.chip,
                {
                  flexDirection: dir,
                  backgroundColor: `${colors.primary}18`,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
                {specialityLabel(spec, locale)}
                {/* The first one is what browse and chat headers show. */}
                {index === 0 ? (isRTL ? " • أساسي" : " • primary") : ""}
              </Text>
              <X size={14} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[
          styles.field,
          { flexDirection: dir, backgroundColor: colors.muted, borderColor: colors.border },
        ]}
      >
        <Search size={16} color={colors.mutedForeground} />
        <AppTextInput
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            cancelScheduledClose();
            setOpen(true);
          }}
          onFocus={() => {
            cancelScheduledClose();
            setOpen(true);
          }}
          onBlur={scheduleClose}
          placeholder={isRTL ? "ابحث عن تخصص…" : "Search specialities…"}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, textAlign }]}
        />
        <ChevronDown size={16} color={colors.mutedForeground} />
      </Pressable>

      {open ? (
        <View
          style={[
            styles.list,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          {...(Platform.OS === "web"
            ? {
                onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault(),
              }
            : {})}
        >
          {matches.length ? (
            matches.map((spec) => (
              <Pressable
                key={spec.id}
                onPress={() => {
                  onToggle(spec.id);
                  setQuery("");
                }}
                style={[styles.row, { borderBottomColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600", textAlign }}>
                  {specialityLabel(spec, locale)}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: 13,
                padding: 12,
                textAlign,
              }}
            >
              {isRTL ? "لا توجد نتائج" : "No matches"}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  chips: { flexWrap: "wrap", gap: 8 },
  chip: {
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  field: {
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 14 },
  list: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  row: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
