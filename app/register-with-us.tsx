import { AppBackButton } from "@/components/nav/AppBackButton";
import { RegisterWithUsForm } from "@/components/marketing/RegisterWithUsForm";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { flexRow } from "@/utils/rtl";

export default function RegisterWithUsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useI18n();
  const dir = flexRow(isRTL);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: colors.border,
            flexDirection: dir,
          },
        ]}
      >
        <AppBackButton
          color={colors.foreground}
          hitSlop={12}
          style={styles.backBtn}
          fallback="/(tabs)/for-doctors"
          accessibilityLabel={t.common.cancel}
        />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t.registerWithUs.title}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardSafeScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: Math.max(insets.bottom, 16) + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <RegisterWithUsForm />
      </KeyboardSafeScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
  },
  title: { fontSize: 17, fontWeight: "800" },
  body: { padding: 20 },
});
