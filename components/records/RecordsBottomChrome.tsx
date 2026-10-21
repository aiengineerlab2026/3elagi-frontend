import React from "react";
import { StyleSheet, View } from "react-native";
import {
  MEDICAL_RECORD_ADD_BAR_HEIGHT,
  MedicalRecordAddBar,
} from "@/components/records/MedicalRecordAddBar";

/** Scroll/content padding for the add bar dock (include safe-area when provided). */
export function recordsBottomChromeHeight(options?: {
  canAdd?: boolean;
  extra?: number;
  safeAreaBottom?: number;
}): number {
  const canAdd = options?.canAdd ?? false;
  const extra = options?.extra ?? 16;
  const safeAreaBottom = options?.safeAreaBottom ?? 0;
  return (canAdd ? MEDICAL_RECORD_ADD_BAR_HEIGHT + safeAreaBottom : 0) + extra;
}

interface Props {
  canAdd?: boolean;
  onAdd?: () => void;
  showDiagnosis?: boolean;
}

/** Fixed bottom add-record bar (AI chat is the global Ask 3elagi AI widget). */
export function RecordsBottomChrome({
  canAdd = false,
  onAdd,
  showDiagnosis,
}: Props) {
  if (!canAdd || !onAdd) return null;

  return (
    <View style={styles.stack} pointerEvents="box-none">
      <MedicalRecordAddBar
        onAdd={onAdd}
        showDiagnosis={showDiagnosis}
        layout="stack"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
});
