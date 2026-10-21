import React from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { EHR } from "@/constants/ehrDesign";
import { useColors } from "@/hooks/useColors";

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  disabled?: boolean;
  loading?: boolean;
  active?: boolean;
};

export function ChatHeaderIconButton({
  onPress,
  accessibilityLabel,
  Icon,
  disabled,
  loading,
  active,
}: Props) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.btn,
        {
          borderColor: active ? EHR.brand : EHR.border,
          backgroundColor:
            pressed || hovered
              ? EHR.brandSoft
              : active
                ? EHR.brandSoft
                : colors.card,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={EHR.brand} />
      ) : (
        <Icon size={18} color={active ? EHR.brandDark : colors.foreground} strokeWidth={2} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: EHR.radius.control,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer" as "auto",
  },
});
