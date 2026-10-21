import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { chatFlexRow } from "@/utils/rtl";

export interface MedicalImageAttachOptionsValue {
  addToMedicalRecords: boolean;
  generateAiInsight: boolean;
}

interface Props {
  isRTL: boolean;
  value: MedicalImageAttachOptionsValue;
  onChange: (value: MedicalImageAttachOptionsValue) => void;
  disabled?: boolean;
}

function Checkbox({
  checked,
  onPress,
  label,
  disabled,
  colors,
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
  disabled?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.optionRow,
        { opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
      ]}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: checked ? colors.primary : colors.border,
            backgroundColor: checked ? colors.primary : "transparent",
          },
        ]}
      >
        {checked ? (
          <Text style={styles.checkMark}>✓</Text>
        ) : null}
      </View>
      <Text style={[styles.optionLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function MedicalImageAttachOptions({
  isRTL,
  value,
  onChange,
  disabled = false,
}: Props) {
  const colors = useColors();
  const dir = chatFlexRow();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.muted,
          borderColor: colors.border,
          flexDirection: dir,
        },
      ]}
    >
      <Checkbox
        checked={value.addToMedicalRecords}
        disabled={disabled}
        colors={colors}
        label={isRTL ? "إضافة إلى السجلات الطبية" : "Add to medical records"}
        onPress={() => {
          const next = !value.addToMedicalRecords;
          onChange({
            addToMedicalRecords: next,
            generateAiInsight: next ? value.generateAiInsight : false,
          });
        }}
      />
      <Checkbox
        checked={value.generateAiInsight}
        disabled={disabled || !value.addToMedicalRecords}
        colors={colors}
        label={isRTL ? "إنشاء تحليل ذكي للصورة" : "Generate AI insight on photo"}
        onPress={() =>
          onChange({
            ...value,
            generateAiInsight: !value.generateAiInsight,
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: "wrap",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 14,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});
