import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import type { useColors } from "@/hooks/useColors";
import { alignText } from "@/utils/rtl";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  secure?: boolean;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
  placeholder?: string;
  autoCapitalize?: "none" | "sentences";
  keyboardType?: "default" | "email-address" | "phone-pad";
  returnKeyType?: "next" | "go" | "done";
  blurOnSubmit?: boolean;
  onSubmitEditing?: () => void;
}

export const AuthFormField = React.forwardRef<TextInput, Props>(function AuthFormField(
  {
    label,
    value,
    onChange,
    error,
    secure,
    colors,
    isRTL,
    placeholder,
    ...rest
  },
  ref,
) {
  // Label and error follow the input's own direction — left-aligned labels over
  // a right-aligned Arabic field read as a broken form.
  const textAlign = alignText(isRTL);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground, textAlign }]}>
        {label}
      </Text>
      <AppTextInput
        ref={ref}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        placeholder={placeholder}
        error={Boolean(error)}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            color: colors.foreground,
            textAlign,
          },
        ]}
        {...rest}
      />
      {error ? (
        <Text style={[styles.error, { color: colors.destructive, textAlign }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});

export function AuthFormError({
  message,
  colors,
}: {
  message: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.formError, { backgroundColor: `${colors.destructive}18` }]}>
      <Text style={[styles.formErrorText, { color: colors.destructive }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, width: "100%" },
  label: { fontSize: 13, fontWeight: "700" },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  error: { fontSize: 12, fontWeight: "600" },
  formError: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: "100%",
  },
  formErrorText: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
});
