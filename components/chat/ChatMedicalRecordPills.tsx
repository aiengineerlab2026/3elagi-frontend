import { ClipboardList } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { chatFlexRow } from "@/utils/rtl";

interface Props {
  isRTL: boolean;
  onAddMedicalRecord: () => void;
  disabled?: boolean;
}

export function ChatMedicalRecordPills({
  isRTL,
  onAddMedicalRecord,
  disabled = false,
}: Props) {
  const colors = useColors();
  const dir = chatFlexRow();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { flexDirection: dir }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={onAddMedicalRecord}
          disabled={disabled}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: pressed ? `${colors.primary}22` : `${colors.primary}12`,
              borderColor: colors.primary,
              flexDirection: dir,
              opacity: disabled ? 0.45 : 1,
            },
          ]}
        >
          <ClipboardList size={15} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
            {isRTL ? "سجل طبي جديد" : "Add medical record"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingBottom: 6,
  },
  row: {
    gap: 8,
    paddingHorizontal: 14,
  },
  chip: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
});
