import { ShieldAlert } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { doctorAccessDeniedMessage } from "@/domains/chat/access";
import { useColors } from "@/hooks/useColors";

interface Props {
  isRTL: boolean;
}

export function DoctorPatientAccessDenied({ isRTL }: Props) {
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
        <ShieldAlert size={28} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {isRTL ? "لا يوجد صلاحية" : "No access"}
      </Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
        {doctorAccessDeniedMessage(isRTL)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
