import { Check, ChevronDown, Search, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { BODY_PART_ICONS, BodyPartIcon } from "@/components/records/bodyPartIcons";
import { ZONE_ACCENT } from "@/components/records/bodyZoneAccents";
import {
  BODY_PARTS,
  BODY_PARTS_BY_ZONE,
  BODY_ZONES,
  type BodyPart,
  type BodyZone,
  zoneForBodyPart,
} from "@/domains/medical/bodyParts";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { chatFlexRow } from "@/utils/rtl";

type Props = {
  value?: BodyPart | null;
  onChange: (part: BodyPart | null) => void;
  label?: string;
  /**
   * When true, "All parts" clears the value (`null`) — for filters.
   * When false, "All parts" selects `general` — for add forms.
   */
  clearable?: boolean;
  placeholder?: string;
};

function partLabel(
  part: BodyPart,
  t: ReturnType<typeof useI18n>["t"],
): string {
  return part === "general" ? t.records.bodyPartAll : t.records.bodyParts[part];
}

export function BodyPartAutocomplete({
  value = null,
  onChange,
  label,
  clearable = false,
  placeholder,
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const dir = chatFlexRow();
  const title = label === undefined ? t.records.bodyPart : label;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = value ? partLabel(value, t) : t.records.bodyPartAll;
  const SelectedIcon = value ? BODY_PART_ICONS[value] : BODY_PART_ICONS.general;
  const selectedZone = value ? zoneForBodyPart(value) : null;
  const selectedAccent = selectedZone ? ZONE_ACCENT[selectedZone] : colors.primary;
  const ph = placeholder ?? (isRTL ? "ابحث عن جزء…" : "Search body part…");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BODY_PARTS.filter((part) => {
      if (!q) return true;
      const labelText = partLabel(part, t).toLowerCase();
      const zone = zoneForBodyPart(part);
      const zoneText = zone ? t.records.bodyZones[zone].toLowerCase() : "";
      return (
        labelText.includes(q) ||
        part.replace(/_/g, " ").includes(q) ||
        zoneText.includes(q)
      );
    });
  }, [query, t]);

  const grouped = useMemo(() => {
    const sections: { zone: BodyZone | "all"; parts: BodyPart[] }[] = [];
    const allParts = options.filter((p) => p === "general");
    if (allParts.length) sections.push({ zone: "all", parts: allParts });
    for (const zone of BODY_ZONES) {
      const parts = options.filter((p) =>
        (BODY_PARTS_BY_ZONE[zone] as readonly string[]).includes(p),
      );
      if (parts.length) sections.push({ zone, parts });
    }
    return sections;
  }, [options]);

  const pick = (part: BodyPart) => {
    if (part === "general" && clearable) onChange(null);
    else onChange(part);
    setOpen(false);
  };

  const clear = () => {
    onChange(clearable ? null : "general");
  };

  return (
    <View style={styles.wrap}>
      {title ? (
        <Text
          style={[
            styles.label,
            { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {title}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={title || t.records.bodyPart}
        style={[
          styles.trigger,
          {
            flexDirection: dir,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <View style={[styles.triggerIcon, { backgroundColor: `${selectedAccent}18` }]}>
          <BodyPartIcon icon={SelectedIcon} size={16} color={selectedAccent} />
        </View>
        <Text
          style={[
            styles.triggerText,
            { color: value ? colors.foreground : colors.mutedForeground },
          ]}
          numberOfLines={1}
        >
          {value ? selectedLabel : t.records.bodyPartAll}
        </Text>
        {value && (clearable || value !== "general") ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              clear();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isRTL ? "مسح" : "Clear"}
          >
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : (
          <ChevronDown size={18} color={colors.mutedForeground} />
        )}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={[
                styles.sheetTitle,
                { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {title || t.records.bodyPart}
            </Text>

            <View
              style={[
                styles.searchRow,
                {
                  flexDirection: dir,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            >
              <Search size={16} color={colors.mutedForeground} />
              <AppTextInput
                value={query}
                onChangeText={setQuery}
                placeholder={ph}
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                autoCorrect={false}
                autoCapitalize="none"
                focusBorder={false}
                style={[
                  styles.searchInput,
                  { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                ]}
              />
              {query.length > 0 ? (
                <Pressable onPress={() => setQuery("")} hitSlop={8}>
                  <X size={16} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>

            <FlatList
              data={grouped}
              keyExtractor={(section) => section.zone}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text
                  style={[
                    styles.empty,
                    { color: colors.mutedForeground, textAlign: "center" },
                  ]}
                >
                  {isRTL ? "لا توجد نتائج" : "No matching parts"}
                </Text>
              }
              renderItem={({ item: section }) => {
                const accent =
                  section.zone === "all" ? colors.primary : ZONE_ACCENT[section.zone];
                const headerLabel =
                  section.zone === "all"
                    ? t.records.bodyPartAll
                    : t.records.bodyZones[section.zone];
                return (
                  <View>
                    <View style={[styles.sectionHeader, { flexDirection: dir }]}>
                      <View style={[styles.sectionDot, { backgroundColor: accent }]} />
                      <Text style={[styles.sectionLabel, { color: accent }]}>
                        {headerLabel}
                      </Text>
                    </View>
                    {section.parts.map((part) => {
                      const active =
                        value === part || (part === "general" && clearable && !value);
                      const Icon = BODY_PART_ICONS[part];
                      const zone = zoneForBodyPart(part);
                      const partAccent = zone ? ZONE_ACCENT[zone] : colors.primary;
                      return (
                        <Pressable
                          key={part}
                          onPress={() => pick(part)}
                          style={[
                            styles.option,
                            {
                              flexDirection: dir,
                              backgroundColor: active ? `${partAccent}14` : "transparent",
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.optionIcon,
                              {
                                backgroundColor: active
                                  ? `${partAccent}22`
                                  : `${colors.foreground}08`,
                              },
                            ]}
                          >
                            <BodyPartIcon
                              icon={Icon}
                              size={16}
                              color={active ? partAccent : colors.foreground}
                            />
                          </View>
                          <Text
                            style={{
                              flex: 1,
                              color: active ? partAccent : colors.foreground,
                              fontWeight: active ? "800" : "600",
                              fontSize: 14,
                              textAlign: isRTL ? "right" : "left",
                            }}
                            numberOfLines={1}
                          >
                            {partLabel(part, t)}
                          </Text>
                          {active ? <Check size={16} color={partAccent} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 13, fontWeight: "700" },
  trigger: {
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
  },
  triggerIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 14,
    paddingBottom: 8,
    paddingHorizontal: 8,
    maxHeight: "78%",
    overflow: "hidden",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  searchRow: {
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
    outlineStyle: "none",
  } as never,
  list: { maxHeight: 380 },
  empty: { paddingVertical: 24, fontSize: 14, fontWeight: "600" },
  sectionHeader: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionDot: { width: 7, height: 7, borderRadius: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  option: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 2,
  },
  optionIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
