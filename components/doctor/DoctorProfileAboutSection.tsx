import React from "react";
import { StyleSheet, Text } from "react-native";
import { DoctorProfileSection } from "@/components/doctor/DoctorProfileSection";
import { UI } from "@/constants/uiTokens";
import type { PublicDoctorProfile } from "@/domains/doctor/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

type Props = {
  doctor: PublicDoctorProfile;
};

export function DoctorProfileAboutSection({ doctor }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const textAlign = isRTL ? "right" : "left";
  const bio = doctor.description?.trim();
  if (!bio) return null;

  return (
    <DoctorProfileSection title={t.doctor.profile.aboutDoctor} textAlign={textAlign} card>
      <Text style={[styles.body, { color: colors.foreground, textAlign }]}>
        {bio}
      </Text>
    </DoctorProfileSection>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
});
