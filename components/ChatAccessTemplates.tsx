import { Ban, Calendar, ClipboardList, Pill, Share2, ShieldCheck, ShieldOff, Stethoscope, Unlock } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { AccessActionType, DoctorPatientAccessStatus } from "@/domains/chat/access";
import { useColors } from "@/hooks/useColors";
import { chatFlexRow } from "@/utils/rtl";

interface Chip {
  key: string;
  label: string;
  icon: React.ReactNode;
  action?: AccessActionType;
  onPress?: () => void;
  tone?: "primary" | "danger" | "muted";
  disabled?: boolean;
}

interface Props {
  isRTL: boolean;
  isDoctor: boolean;
  access: DoctorPatientAccessStatus | null;
  showDiagnosis?: boolean;
  showPrescription?: boolean;
  showMedicalRecordActions?: boolean;
  medicalActionsDisabled?: boolean;
  onAccessAction: (action: AccessActionType) => void;
  onDiagnosisPress?: () => void;
  onPrescriptionPress?: () => void;
  onAssignIntakeExam?: () => void;
  onAddMedicalRecord?: () => void;
  onShareMedicalRecord?: () => void;
  onBookAppointment?: () => void;
}

export function ChatAccessTemplates({
  isRTL,
  isDoctor,
  access,
  showDiagnosis = false,
  showPrescription = false,
  showMedicalRecordActions = false,
  medicalActionsDisabled = false,
  onAccessAction,
  onDiagnosisPress,
  onPrescriptionPress,
  onAssignIntakeExam,
  onAddMedicalRecord,
  onShareMedicalRecord,
  onBookAppointment,
}: Props) {
  const colors = useColors();
  const dir = chatFlexRow();
  const chips: Chip[] = [];

  if (isDoctor) {
    if (access?.records_allowed && !access.is_blocked) {
      if (showDiagnosis) {
        chips.push({
          key: "diagnosis",
          label: isRTL ? "تشخيص جديد" : "New diagnosis",
          icon: <Stethoscope size={15} color={colors.primary} />,
          onPress: onDiagnosisPress,
          tone: "primary",
        });
      }
      if (showPrescription) {
        chips.push({
          key: "prescription",
          label: isRTL ? "روشتة جديدة" : "New prescription",
          icon: <Pill size={15} color={colors.primary} />,
          onPress: onPrescriptionPress,
          tone: "primary",
        });
      }
      if (showDiagnosis || showPrescription) {
        chips.push({
          key: "intake_exam",
          label: isRTL ? "فحص متابعة" : "Follow-up exam",
          icon: <ClipboardList size={15} color={colors.primary} />,
          onPress: onAssignIntakeExam,
          tone: "primary",
        });
      }
    }
    if (showMedicalRecordActions && access?.records_allowed && !access?.is_blocked) {
      chips.push({
        key: "add_medical",
        label: isRTL ? "سجل طبي جديد" : "Add medical record",
        icon: <ClipboardList size={15} color={colors.primary} />,
        onPress: onAddMedicalRecord,
        tone: "primary",
        disabled: medicalActionsDisabled,
      });
    }
    if (!access?.blocked_by_doctor) {
      chips.push({
        key: "doctor_block",
        label: isRTL ? "حظر المريض" : "Block patient",
        icon: <Ban size={15} color={colors.destructive} />,
        action: "doctor_block",
        tone: "danger",
      });
    } else {
      chips.push({
        key: "doctor_unblock",
        label: isRTL ? "إلغاء الحظر" : "Unblock patient",
        icon: <Unlock size={15} color={colors.primary} />,
        action: "doctor_unblock",
        tone: "primary",
      });
    }
  } else {
    if (!access?.is_blocked) {
      chips.push({
        key: "book_appointment",
        label: isRTL ? "حجز موعد" : "Book appointment",
        icon: <Calendar size={15} color={colors.primary} />,
        onPress: onBookAppointment,
        tone: "primary",
      });
    }
    if (showMedicalRecordActions && !access?.is_blocked) {
      chips.push({
        key: "share_medical",
        label: isRTL ? "مشاركة سجل طبي" : "Share medical record",
        icon: <Share2 size={15} color={colors.primary} />,
        onPress: onShareMedicalRecord,
        tone: "primary",
        disabled: medicalActionsDisabled,
      });
      chips.push({
        key: "add_medical",
        label: isRTL ? "سجل طبي جديد" : "Add medical record",
        icon: <ClipboardList size={15} color={colors.primary} />,
        onPress: onAddMedicalRecord,
        tone: "primary",
        disabled: medicalActionsDisabled,
      });
    }
    if (!access?.records_allowed && !access?.is_blocked) {
      chips.push({
        key: "grant",
        label: isRTL ? "منح صلاحية السجل" : "Grant record access",
        icon: <ShieldCheck size={15} color={colors.primary} />,
        action: "grant_records",
        tone: "primary",
      });
    }
    if (access?.records_allowed && !access?.is_blocked) {
      chips.push({
        key: "revoke",
        label: isRTL ? "إلغاء الصلاحية" : "Revoke access",
        icon: <ShieldOff size={15} color={colors.mutedForeground} />,
        action: "revoke_records",
        tone: "muted",
      });
    }
    if (!access?.blocked_by_patient) {
      chips.push({
        key: "patient_block",
        label: isRTL ? "حظر الطبيب" : "Block doctor",
        icon: <Ban size={15} color={colors.destructive} />,
        action: "patient_block",
        tone: "danger",
      });
    } else {
      chips.push({
        key: "patient_unblock",
        label: isRTL ? "إلغاء الحظر" : "Unblock doctor",
        icon: <Unlock size={15} color={colors.primary} />,
        action: "patient_unblock",
        tone: "primary",
      });
    }
  }

  if (!chips.length) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { flexDirection: dir }]}
        keyboardShouldPersistTaps="handled"
      >
        {chips.map((chip) => {
          const toneColor =
            chip.tone === "danger"
              ? colors.destructive
              : chip.tone === "muted"
                ? colors.mutedForeground
                : colors.primary;
          return (
            <Pressable
              key={chip.key}
              onPress={() => {
                if (chip.disabled) return;
                if (chip.action) onAccessAction(chip.action);
                else chip.onPress?.();
              }}
              disabled={chip.disabled}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: pressed ? `${toneColor}22` : `${toneColor}12`,
                  borderColor: toneColor,
                  flexDirection: dir,
                  opacity: chip.disabled ? 0.45 : 1,
                },
              ]}
            >
              {chip.icon}
              <Text style={{ color: toneColor, fontWeight: "700", fontSize: 13 }}>{chip.label}</Text>
            </Pressable>
          );
        })}
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
