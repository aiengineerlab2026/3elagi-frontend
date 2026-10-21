import { BadgeCheck, Plus, Upload, X } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { PROFILE_SETTINGS } from "@/constants/profileSettingsDesign";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

type Props = {
  previewUri?: string | null;
  uploading: boolean;
  onPick: () => void;
  onClear: () => void;
  isRTL: boolean;
};

export function DoctorDigitalSignatureField({
  previewUri,
  uploading,
  onPick,
  onClear,
  isRTL,
}: Props) {
  const colors = useColors();
  const { t } = useI18n();
  const dir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const hasSignature = Boolean(previewUri);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionLabel, { color: PROFILE_SETTINGS.text.section, textAlign }]}>
        {t.settings.digitalSignature}
      </Text>
      <Text style={[styles.hint, { color: PROFILE_SETTINGS.text.secondary, textAlign }]}>
        {t.settings.signatureHint}
      </Text>

      {hasSignature ? (
        <View style={[styles.statusRow, { flexDirection: dir, borderColor: PROFILE_SETTINGS.verified.border, backgroundColor: PROFILE_SETTINGS.verified.bg }]}>
          <BadgeCheck size={18} color={PROFILE_SETTINGS.verified.text} />
          <Text style={{ color: PROFILE_SETTINGS.verified.text, fontWeight: "700", fontSize: 14 }}>
            {isRTL ? "تم رفع التوقيع ✓" : "Signature uploaded ✓"}
          </Text>
        </View>
      ) : null}

      {hasSignature ? (
        <View style={[styles.previewWrap, { borderColor: PROFILE_SETTINGS.border }]}>
          <Image source={{ uri: previewUri! }} style={styles.preview} resizeMode="contain" />
          <View style={[styles.actions, { flexDirection: dir }]}>
            <Pressable
              onPress={onClear}
              style={[styles.actionBtn, { borderColor: PROFILE_SETTINGS.border }]}
              accessibilityRole="button"
              accessibilityLabel={isRTL ? "مسح" : "Clear"}
            >
              <X size={16} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontWeight: "700", fontSize: 13 }}>
                {isRTL ? "مسح" : "Clear"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void onPick()}
              disabled={uploading}
              style={[styles.actionBtn, styles.primaryAction, { borderColor: PROFILE_SETTINGS.brand }]}
              accessibilityRole="button"
              accessibilityLabel={isRTL ? "إعادة الرفع" : "Re-upload"}
            >
              {uploading ? (
                <ActivityIndicator color={PROFILE_SETTINGS.brand} size="small" />
              ) : (
                <>
                  <Upload size={16} color={PROFILE_SETTINGS.brand} />
                  <Text style={{ color: PROFILE_SETTINGS.brand, fontWeight: "700", fontSize: 13 }}>
                    {isRTL ? "إعادة الرفع" : "Re-upload"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => void onPick()}
          disabled={uploading}
          style={[styles.uploadBtn, { borderColor: PROFILE_SETTINGS.brand, flexDirection: dir }]}
        >
          {uploading ? (
            <ActivityIndicator color={PROFILE_SETTINGS.brand} size="small" />
          ) : (
            <>
              <Plus size={18} color={PROFILE_SETTINGS.brand} />
              <Text style={{ color: PROFILE_SETTINGS.brand, fontWeight: "700" }}>
                {t.settings.pickImage}
              </Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  sectionLabel: { fontSize: 14, fontWeight: "700" },
  hint: { fontSize: 13, lineHeight: 18 },
  statusRow: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: PROFILE_SETTINGS.radius.control,
    borderWidth: 1,
  },
  previewWrap: {
    borderWidth: 1,
    borderRadius: PROFILE_SETTINGS.radius.card,
    padding: 12,
    gap: 12,
    backgroundColor: PROFILE_SETTINGS.bg.card,
  },
  preview: {
    width: "100%",
    height: 120,
    borderRadius: PROFILE_SETTINGS.radius.control,
  },
  actions: {
    gap: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: PROFILE_SETTINGS.radius.control,
    borderWidth: 1,
  },
  primaryAction: {
    backgroundColor: `${PROFILE_SETTINGS.brand}08`,
  },
  uploadBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: PROFILE_SETTINGS.radius.card,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
});
