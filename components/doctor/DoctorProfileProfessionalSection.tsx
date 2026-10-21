import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { DoctorProfileSection } from "@/components/doctor/DoctorProfileSection";
import { UI } from "@/constants/uiTokens";
import { doctorTagRowStyle, doctorTagTextStyle } from "@/domains/doctor/tagDisplay";
import type { PublicDoctorProfile } from "@/domains/doctor/api";
import { useColors } from "@/hooks/useColors";
import { useDoctorTagLabels } from "@/hooks/useDoctorTagLabels";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { flexRow } from "@/utils/rtl";

type Props = {
  doctor: PublicDoctorProfile;
  specialtyLabel: string;
};

type InfoRow = {
  label: string;
  value: string;
};

export function DoctorProfileProfessionalSection({ doctor, specialtyLabel }: Props) {
  const colors = useColors();
  const { t, isRTL, locale } = useI18n();
  const { isMobile } = useWebLayout();
  const dir = flexRow(isRTL);
  const textAlign = isRTL ? "right" : "left";
  const tagItems = useDoctorTagLabels(doctor.tags, locale);
  const chipRowStyle = doctorTagRowStyle(isRTL);

  const rows = useMemo(() => {
    const items: InfoRow[] = [];
    const specialty = specialtyLabel.trim();
    if (specialty) {
      items.push({ label: t.home.specialty, value: specialty });
    }
    if (doctor.experienceYears != null && doctor.experienceYears > 0) {
      items.push({
        label: t.home.experience,
        value: t.home.yearsExperience(doctor.experienceYears),
      });
    }
    return items;
  }, [doctor.experienceYears, specialtyLabel, t]);

  if (rows.length === 0 && tagItems.length === 0) return null;

  return (
    <DoctorProfileSection title={t.doctor.profile.professionalInfo} textAlign={textAlign} card>
      {rows.length > 0 ? (
        <View style={styles.list}>
          {rows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.row,
                isMobile ? styles.rowMobile : { flexDirection: dir },
                index < rows.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: `${colors.border}66`,
                  paddingBottom: UI.space.sm,
                },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  isMobile && styles.labelMobile,
                  { color: colors.mutedForeground, textAlign },
                ]}
              >
                {row.label}
              </Text>
              <Text style={[styles.value, { color: colors.foreground, textAlign }]}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {tagItems.length > 0 ? (
        <View
          style={[
            styles.tagsBlock,
            rows.length > 0 && styles.tagsBlockSpaced,
            { alignItems: isRTL ? "flex-end" : "flex-start" },
          ]}
        >
          <Text
            style={[
              styles.label,
              isMobile && styles.labelMobile,
              { color: colors.mutedForeground, textAlign, width: "100%" },
            ]}
          >
            {t.doctor.profile.tags}
          </Text>
          <View style={[styles.tagChips, chipRowStyle, { flexDirection: dir }]}>
            {tagItems.map(({ canonical, display }) => (
              <View
                key={canonical}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: `${colors.primary}14`,
                    borderColor: `${colors.primary}55`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tagChipText,
                    { color: colors.primary },
                    doctorTagTextStyle(display, locale),
                  ]}
                >
                  {display}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </DoctorProfileSection>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: UI.space.sm,
  },
  row: {
    gap: UI.space.md,
    alignItems: "flex-start",
  },
  rowMobile: {
    flexDirection: "column",
    gap: 4,
  },
  label: {
    width: 112,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  labelMobile: {
    width: "auto",
  },
  value: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  tagsBlock: {
    gap: UI.space.sm,
    width: "100%",
  },
  tagsBlockSpaced: {
    marginTop: UI.space.sm,
    paddingTop: UI.space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148, 163, 184, 0.35)",
  },
  tagChips: {
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
});
