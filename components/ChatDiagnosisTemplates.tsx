import { Stethoscope } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { flexRow } from "@/utils/rtl";

interface Props {
  isRTL: boolean;
  onPress: () => void;
}

export function ChatDiagnosisTemplates({ isRTL, onPress }: Props) {
  const colors = useColors();
  const dir = flexRow(isRTL);
  const label = isRTL ? "تشخيص جديد" : "New diagnosis";

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: pressed ? `${colors.primary}22` : `${colors.primary}12`,
            borderColor: colors.primary,
            flexDirection: dir,
          },
        ]}
      >
        <Stethoscope size={15} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  chip: {
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
});
