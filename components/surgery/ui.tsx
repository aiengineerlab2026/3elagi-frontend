import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import type { ReservationStatus } from "@/domains/surgery/api";

/** Small shared primitives for the hospital / surgery screens. */

export function Section({
  title,
  children,
  right,
}: {
  title?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {title || right ? (
        <View style={styles.sectionHead}>
          {title ? (
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
          ) : null}
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label: string }) {
  const colors = useColors();
  return (
    <View style={{ gap: 4, flexGrow: 1 }}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        {...props}
        style={[
          styles.input,
          { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background },
          props.multiline && { minHeight: 72, textAlignVertical: "top" },
          style,
        ]}
      />
    </View>
  );
}

export function Chip({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      style={[
        styles.chip,
        {
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? colors.primary : colors.background,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: active ? "#fff" : colors.foreground,
          fontWeight: "600",
          textDecorationLine: disabled ? "line-through" : "none",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  busy,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger";
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const colors = useColors();
  const bg =
    variant === "primary" ? colors.primary : variant === "danger" ? colors.destructive : "transparent";
  const fg = variant === "outline" ? colors.foreground : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: variant === "outline" ? colors.border : bg,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} size="small" /> : null}
      <Text style={{ color: fg, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

export function StatusBadge({ status, label }: { status: ReservationStatus; label: string }) {
  const colors = useColors();
  const tone = {
    pending: "#b45309",
    approved: "#15803d",
    rejected: colors.destructive,
    cancelled: colors.mutedForeground,
  }[status];
  return (
    <View style={[styles.badge, { borderColor: tone }]}>
      <Text style={{ color: tone, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

/** Localised label for a reservation / link status. */
export function useStatusLabel() {
  const { t } = useI18n();
  return (s: ReservationStatus) =>
    ({
      pending: t.surgery.statusPending,
      approved: t.surgery.statusApproved,
      rejected: t.surgery.statusRejected,
      cancelled: t.surgery.statusCancelled,
    })[s];
}

/** "Hospital: Approved · Doctor: Pending" — both must approve a surgery booking. */
export function ApprovalLine({ r }: { r: { hospital_status?: ReservationStatus; doctor_status?: ReservationStatus } }) {
  const { t } = useI18n();
  const label = useStatusLabel();
  const mark = (s?: ReservationStatus) => (s === "approved" ? "✓" : s === "rejected" ? "✕" : "…");
  if (!r.hospital_status || !r.doctor_status) return null;
  return (
    <Muted>
      {t.surgery.hospitalLabel}: {mark(r.hospital_status)} {label(r.hospital_status)} · {t.surgery.doctor}:{" "}
      {mark(r.doctor_status)} {label(r.doctor_status)}
    </Muted>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>{children}</Text>;
}

export const surgeryStyles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  page: { padding: 16, paddingBottom: 48, gap: 16, maxWidth: 860, width: "100%", alignSelf: "center" },
});

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  label: { fontSize: 12, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" },
});
