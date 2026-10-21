import { ShieldAlert, ShieldCheck } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { DoctorPatientAccessStatus } from "@/domains/chat/access";
import { useColors } from "@/hooks/useColors";

interface Props {
  isRTL: boolean;
  isDoctor: boolean;
  access: DoctorPatientAccessStatus | null;
}

export function ChatAccessBanner({ isRTL, isDoctor, access }: Props) {
  const colors = useColors();

  if (!access) return null;

  if (access.is_blocked) {
    const blockedBySelf = isDoctor
      ? access.blocked_by_doctor
      : access.blocked_by_patient;
    const text = blockedBySelf
      ? isRTL
        ? "لقد حظرت هذه المحادثة"
        : "You blocked this chat"
      : isRTL
        ? "هذه المحادثة محظورة"
        : "This chat is blocked";

    return (
      <View style={[styles.wrap, { backgroundColor: `${colors.destructive}18` }]}>
        <ShieldAlert size={16} color={colors.destructive} />
        <Text style={[styles.text, { color: colors.destructive, textAlign: isRTL ? "right" : "left" }]}>
          {text}
        </Text>
      </View>
    );
  }

  if (isDoctor && !access.records_allowed) {
    return (
      <View style={[styles.wrap, { backgroundColor: `${colors.primary}12` }]}>
        <ShieldAlert size={16} color={colors.primary} />
        <Text style={[styles.text, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
          {isRTL
            ? "المريض لم يمنحك صلاحية تعديل السجل الطبي بعد"
            : "Patient has not granted permission to edit medical records yet"}
        </Text>
      </View>
    );
  }

  if (!isDoctor && access.records_allowed) {
    return (
      <View style={[styles.wrap, { backgroundColor: `${colors.primary}10` }]}>
        <ShieldCheck size={16} color={colors.primary} />
        <Text style={[styles.text, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
          {isRTL
            ? "الطبيب يمكنه عرض وتعديل سجلك الطبي — يمكنك إلغاء الصلاحية من الأزرار بالأسفل"
            : "Doctor can view and edit your medical records — revoke access from the buttons below"}
        </Text>
      </View>
    );
  }

  if (!isDoctor && !access.records_allowed) {
    return (
      <View style={[styles.wrap, { backgroundColor: `${colors.primary}12` }]}>
        <ShieldAlert size={16} color={colors.primary} />
        <Text style={[styles.text, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
          {isRTL
            ? "لم تمنح هذا الطبيب صلاحية السجل الطبي بعد — استخدم «منح صلاحية السجل» بالأسفل"
            : "This doctor does not have record access yet — use “Grant record access” below"}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
});
