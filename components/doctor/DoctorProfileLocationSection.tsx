import { ExternalLink, MapPin } from "lucide-react-native";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { DoctorProfileSection } from "@/components/doctor/DoctorProfileSection";
import { GoogleMapsEmbed } from "@/components/doctor/GoogleMapsEmbed";
import {
  resolveDoctorLocation,
} from "@/components/doctor/doctorProfileLocation";
import { UI } from "@/constants/uiTokens";
import type { PublicDoctorClinic } from "@/domains/doctor/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { flexRow } from "@/utils/rtl";

type Props = {
  clinic: PublicDoctorClinic | null;
  profileLocation?: string | null;
};

export function DoctorProfileLocationSection({ clinic, profileLocation }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isMobile } = useWebLayout();
  const dir = flexRow(isRTL);
  const textAlign = isRTL ? "right" : "left";
  const location = resolveDoctorLocation(clinic, profileLocation);
  if (!location) return null;

  const openMaps = () => {
    void Linking.openURL(location.openUrl);
  };

  return (
    <DoctorProfileSection title={t.doctor.profile.location} textAlign={textAlign} card>
      <View style={[styles.addressRow, { flexDirection: dir }]}>
        <MapPin size={15} color={colors.mutedForeground} style={{ marginTop: 2 }} />
        <View style={styles.addressText}>
          {location.clinicName ? (
            <Text style={[styles.clinicName, { color: colors.foreground, textAlign }]}>
              {location.clinicName}
            </Text>
          ) : null}
          {location.address ? (
            <Text style={[styles.address, { color: colors.mutedForeground, textAlign }]}>
              {location.address}
            </Text>
          ) : null}
        </View>
      </View>

      <GoogleMapsEmbed query={location.mapQuery} height={isMobile ? 160 : 176} />

      <Pressable
        onPress={openMaps}
        accessibilityRole="link"
        style={({ pressed }) => [
          styles.mapsLink,
          { flexDirection: dir, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <ExternalLink size={13} color={colors.primary} />
        <Text style={[styles.mapsLinkText, { color: colors.primary }]}>
          {t.doctor.profile.openInGoogleMaps}
        </Text>
      </Pressable>
    </DoctorProfileSection>
  );
}

const styles = StyleSheet.create({
  addressRow: {
    gap: UI.space.sm,
    alignItems: "flex-start",
  },
  addressText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  clinicName: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  address: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  mapsLink: {
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingVertical: 2,
    ...UI.pressable,
  },
  mapsLinkText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
