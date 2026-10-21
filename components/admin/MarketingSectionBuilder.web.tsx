import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { EmailBuilderTextField } from "@/components/admin/EmailBuilderTextField.web";
import {
  MARKETING_SECTION_TYPES,
  SECTION_TYPE_LABELS,
  createEmptySection,
  moveSection,
  type MarketingCalloutVariant,
  type MarketingEmailSection,
  type MarketingSectionType,
} from "@/domains/admin/marketingSections";
import { useColors } from "@/hooks/useColors";

interface Props {
  sections: MarketingEmailSection[];
  onChange: (sections: MarketingEmailSection[]) => void;
  dir?: "ltr" | "rtl";
}

function updateSection(
  sections: MarketingEmailSection[],
  id: string,
  patch: Partial<MarketingEmailSection>,
): MarketingEmailSection[] {
  return sections.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

export function MarketingSectionBuilder({ sections, onChange, dir = "ltr" }: Props) {
  const colors = useColors();
  const [addOpen, setAddOpen] = useState(false);
  const textAlign = dir === "rtl" ? "right" : "left";

  if (Platform.OS !== "web") return null;

  const patch = (id: string, patchValue: Partial<MarketingEmailSection>) => {
    onChange(updateSection(sections, id, patchValue));
  };

  const remove = (id: string) => {
    onChange(sections.filter((s) => s.id !== id));
  };

  const add = (type: MarketingSectionType) => {
    onChange([...sections, createEmptySection(type)]);
    setAddOpen(false);
  };

  return (
    <View style={styles.wrap}>
      {sections.map((section, index) => (
        <View
          key={section.id}
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {SECTION_TYPE_LABELS[section.type]}
            </Text>
            <View style={styles.cardActions}>
              <Pressable
                onPress={() => onChange(moveSection(sections, index, -1))}
                disabled={index === 0}
                style={({ pressed }) => [
                  styles.iconBtn,
                  { borderColor: colors.border, opacity: index === 0 ? 0.35 : pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={{ color: colors.foreground }}>↑</Text>
              </Pressable>
              <Pressable
                onPress={() => onChange(moveSection(sections, index, 1))}
                disabled={index === sections.length - 1}
                style={({ pressed }) => [
                  styles.iconBtn,
                  {
                    borderColor: colors.border,
                    opacity: index === sections.length - 1 ? 0.35 : pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={{ color: colors.foreground }}>↓</Text>
              </Pressable>
              <Pressable
                onPress={() => remove(section.id)}
                style={({ pressed }) => [
                  styles.iconBtn,
                  {
                    borderColor: "#fecaca",
                    backgroundColor: pressed ? "#fef2f2" : colors.background,
                  },
                ]}
              >
                <Text style={{ color: "#dc2626", fontWeight: "700" }}>✕</Text>
              </Pressable>
            </View>
          </View>

          {(section.type === "heading" ||
            section.type === "paragraph" ||
            section.type === "custom" ||
            section.type === "callout" ||
            section.type === "cta") && (
            <Field label={section.type === "heading" ? "Text" : "HTML content"} colors={colors}>
              <EmailBuilderTextField
                value={section.html ?? ""}
                onChangeText={(html) => patch(section.id, { html })}
                multiline
                textAlign={textAlign}
              />
            </Field>
          )}

          {(section.type === "feature_box" ||
            section.type === "callout" ||
            section.type === "screenshots") && (
            <Field label="Title" colors={colors}>
              <EmailBuilderTextField
                value={section.title ?? ""}
                onChangeText={(title) => patch(section.id, { title })}
                textAlign={textAlign}
              />
            </Field>
          )}

          {section.type === "callout" && (
            <Field label="Style" colors={colors}>
              <View style={styles.chipRow}>
                {(["soft", "accent", "highlight"] as MarketingCalloutVariant[]).map((variant) => {
                  const active = (section.variant ?? "soft") === variant;
                  return (
                    <Pressable
                      key={variant}
                      onPress={() => patch(section.id, { variant })}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? `${colors.primary}14` : colors.background,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: active ? colors.primary : colors.foreground,
                          fontWeight: active ? "800" : "600",
                          fontSize: 12,
                        }}
                      >
                        {variant}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>
          )}

          {section.type === "feature_box" && (
            <Field label="Bullet items (one per line)" colors={colors}>
              <EmailBuilderTextField
                value={(section.items ?? []).join("\n")}
                onChangeText={(raw) =>
                  patch(section.id, {
                    items: raw.split("\n").map((line) => line.trim()).filter(Boolean),
                  })
                }
                multiline
                textAlign={textAlign}
              />
            </Field>
          )}

          {section.type === "cta" && (
            <>
              <Field label="Button label" colors={colors}>
                <EmailBuilderTextField
                  value={section.buttonLabel ?? ""}
                  onChangeText={(buttonLabel) => patch(section.id, { buttonLabel })}
                  textAlign={textAlign}
                />
              </Field>
              <Field label="Button URL" colors={colors}>
                <EmailBuilderTextField
                  value={section.buttonUrl ?? ""}
                  onChangeText={(buttonUrl) => patch(section.id, { buttonUrl })}
                  autoCapitalize="none"
                  textAlign={textAlign}
                />
              </Field>
            </>
          )}

          {section.type === "screenshots" && (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Shows the five platform screenshots with localized captions.
            </Text>
          )}
        </View>
      ))}

      <View style={styles.addRow}>
        <Pressable
          onPress={() => setAddOpen((v) => !v)}
          style={({ pressed }) => [
            styles.addBtn,
            {
              borderColor: colors.primary,
              backgroundColor: pressed ? `${colors.primary}14` : colors.background,
            },
          ]}
        >
          <Text style={{ color: colors.primary, fontWeight: "800" }}>+ Add section</Text>
        </Pressable>
      </View>

      {addOpen ? (
        <View style={[styles.addMenu, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {MARKETING_SECTION_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => add(type)}
              style={({ pressed }) => [
                styles.addMenuItem,
                { backgroundColor: pressed ? colors.muted : "transparent" },
              ]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                {SECTION_TYPE_LABELS[type]}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Use {"{{name}}"} for the doctor&apos;s name. Click Add emoji to insert
        icons beside your text. Header logo and footer are added when sending.
      </Text>
    </View>
  );
}

function Field({
  label,
  colors,
  children,
}: {
  label: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginTop: 4 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", flex: 1 },
  cardActions: { flexDirection: "row", gap: 6 },
  iconBtn: {
    borderWidth: 1,
    borderRadius: 8,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer" as "auto",
  },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    cursor: "pointer" as "auto",
  },
  addRow: { flexDirection: "row" },
  addBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    cursor: "pointer" as "auto",
  },
  addMenu: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  addMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    cursor: "pointer" as "auto",
  },
  hint: { fontSize: 11, lineHeight: 16 },
});
