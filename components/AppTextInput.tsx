import React, { forwardRef, useCallback, useMemo, useState } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";

export type AppTextInputProps = TextInputProps & {
  error?: boolean;
  /** When false, skip primary focus border (e.g. border lives on a parent wrapper). */
  focusBorder?: boolean;
};

function hasVisibleBorder(style: StyleProp<TextStyle>): boolean {
  const flat = StyleSheet.flatten(style);
  if (!flat) return false;
  const width = flat.borderWidth;
  return typeof width === "number" ? width > 0 : false;
}

export const AppTextInput = forwardRef<TextInput, AppTextInputProps>(function AppTextInput(
  {
    style,
    error,
    focusBorder,
    editable = true,
    onFocus,
    onBlur,
    placeholderTextColor,
    ...rest
  },
  ref,
) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const showFocusBorder = focusBorder ?? hasVisibleBorder(style);

  const flat = useMemo(() => StyleSheet.flatten(style), [style]);
  const staticBorderColor =
    (flat?.borderColor as string | undefined) ?? colors.border;

  const borderColor =
    error === true
      ? colors.destructive
      : focused && editable !== false && showFocusBorder
        ? colors.primary
        : staticBorderColor;

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
      setFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
      setFocused(false);
      onBlur?.(e);
    },
    [onBlur],
  );

  return (
    <TextInput
      ref={ref}
      editable={editable}
      placeholderTextColor={placeholderTextColor ?? colors.mutedForeground}
      {...rest}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={[
        style,
        showFocusBorder && { borderColor },
        Platform.OS === "web"
          ? ({
              outlineStyle: "none",
              transition: "border-color 150ms ease",
            } as unknown as TextStyle)
          : null,
      ]}
    />
  );
});
