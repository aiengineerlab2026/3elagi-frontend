import { Plus, Search, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import {
  canCreateDoctorTag,
  MAX_DOCTOR_TAGS,
  normalizeDoctorTag,
} from "@/domains/doctor/tagSuggestions";
import { doctorTagTextStyle } from "@/domains/doctor/tagDisplay";
import {
  fetchDoctorTagSuggestions,
  type DoctorTagSuggestion,
} from "@/domains/doctor/tags-api";
import { useDoctorTagLabels } from "@/hooks/useDoctorTagLabels";
import type { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  primarySpecialityId: string;
  isRTL: boolean;
  colors: ReturnType<typeof useColors>;
  disabled?: boolean;
};

export function DoctorTagsInput({
  tags,
  onChange,
  primarySpecialityId,
  isRTL,
  colors,
  disabled = false,
}: Props) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<DoctorTagSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const tagItems = useDoctorTagLabels(tags, locale);

  useEffect(() => {
    if (!open || disabled) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoadingSuggestions(true);
      void fetchDoctorTagSuggestions({
        primarySpecialityId,
        locale,
        q: query,
        limit: 8,
      })
        .then((rows) => {
          if (cancelled) return;
          const selectedLower = new Set(tags.map((tag) => tag.toLowerCase()));
          setSuggestions(
            rows.filter((row) => !selectedLower.has(row.labelEn.toLowerCase())),
          );
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingSuggestions(false);
        });
    }, query.trim() ? 250 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, disabled, query, primarySpecialityId, tags, locale]);

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

  const createTag = useMemo(() => canCreateDoctorTag(query, tags), [query, tags]);
  const atLimit = tags.length >= MAX_DOCTOR_TAGS;

  const addTag = (raw: string) => {
    const tag = normalizeDoctorTag(raw);
    if (!tag || tags.length >= MAX_DOCTOR_TAGS) return;
    const key = tag.toLowerCase();
    if (tags.some((existing) => existing.toLowerCase() === key)) return;
    onChange([...tags, tag]);
    setQuery("");
    setOpen(false);
  };

  const removeTag = (canonical: string) => {
    onChange(tags.filter((existing) => existing !== canonical));
  };

  const submitQuery = () => {
    if (createTag) addTag(createTag);
  };

  return (
    <View style={styles.wrap}>
      {tagItems.length ? (
        <View style={[styles.chips, { flexDirection: dir }]}>
          {tagItems.map(({ canonical, display }) => (
            <Pressable
              key={canonical}
              disabled={disabled}
              onPress={() => removeTag(canonical)}
              style={[
                styles.chip,
                {
                  flexDirection: dir,
                  backgroundColor: `${colors.primary}18`,
                  borderColor: colors.primary,
                  opacity: disabled ? 0.6 : 1,
                },
              ]}
            >
              <Text
                style={[
                  { color: colors.primary, fontWeight: "700", fontSize: 13 },
                  doctorTagTextStyle(display, locale),
                ]}
              >
                {display}
              </Text>
              <X size={14} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
        {t.settings.doctorTagsHint}
      </Text>

      <View
        style={[
          styles.field,
          {
            flexDirection: dir,
            backgroundColor: colors.muted,
            borderColor: colors.border,
            opacity: disabled || atLimit ? 0.6 : 1,
          },
        ]}
      >
        <Search size={16} color={colors.mutedForeground} />
        <AppTextInput
          value={query}
          editable={!disabled && !atLimit}
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
          onSubmitEditing={submitQuery}
          returnKeyType="done"
          placeholder={
            atLimit ? t.settings.doctorTagsLimit(MAX_DOCTOR_TAGS) : t.settings.doctorTagsPlaceholder
          }
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, textAlign }]}
        />
      </View>

      {open && !disabled && !atLimit ? (
        <View
          style={[
            styles.list,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          {...(Platform.OS === "web"
            ? {
                // Keep input focused while picking a suggestion on web.
                onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault(),
              }
            : {})}
        >
          {createTag ? (
            <Pressable
              onPress={() => addTag(createTag)}
              style={[styles.row, styles.createRow, { borderBottomColor: colors.border, flexDirection: dir }]}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "700", textAlign, flex: 1 }}>
                {t.settings.doctorTagsCreate(createTag)}
              </Text>
            </Pressable>
          ) : null}

          {loadingSuggestions ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : suggestions.length ? (
            suggestions.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => addTag(item.labelEn)}
                style={[styles.row, { borderBottomColor: colors.border, flexDirection: dir }]}
              >
                <Text
                  style={[
                    { color: colors.foreground, fontWeight: "600", flex: 1 },
                    doctorTagTextStyle(item.label, locale),
                  ]}
                >
                  {item.label}
                </Text>
                {item.source === "subspecialty" ? (
                  <Text style={[styles.badge, { color: colors.mutedForeground }]}>
                    {t.settings.doctorTagsSubspecialtyBadge}
                  </Text>
                ) : null}
              </Pressable>
            ))
          ) : !createTag ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 13, padding: 12, textAlign }}>
              {t.settings.doctorTagsEmpty}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  hint: { fontSize: 12, lineHeight: 17 },
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
  row: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  loadingRow: {
    paddingVertical: 16,
    alignItems: "center",
  },
  createRow: {
    backgroundColor: "rgba(59, 130, 246, 0.06)",
  },
  badge: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
