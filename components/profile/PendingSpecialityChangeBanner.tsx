import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { PendingSpecialityChange } from "@/domains/auth/profile-api";
import { alignText } from "@/utils/rtl";

type Props = {
  pending: PendingSpecialityChange;
  isRTL: boolean;
  colors: {
    foreground: string;
    muted: string;
    border: string;
    primary: string;
  };
};

export function PendingSpecialityChangeBanner({ pending, isRTL, colors }: Props) {
  const textAlign = alignText(isRTL);
  const current = isRTL
    ? pending.current_speciality_name_ar
    : pending.current_speciality_name_en;
  const requested = isRTL
    ? pending.requested_speciality_name_ar
    : pending.requested_speciality_name_en;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.muted,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.primary, textAlign }]}>
        {isRTL ? "تغيير التخصص قيد المراجعة" : "Speciality change pending approval"}
      </Text>
      <Text style={[styles.body, { color: colors.foreground, textAlign }]}>
        {isRTL
          ? `طلبت تغيير التخصص الأساسي من ${current ?? "—"} إلى ${requested}. سيتم تطبيق التغيير بعد موافقة الإدارة.`
          : `You requested to change your primary speciality from ${current ?? "—"} to ${requested}. Admin must approve before it takes effect.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
});
