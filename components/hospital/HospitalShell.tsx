import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Muted, Section, surgeryStyles } from "@/components/surgery/ui";
import type { MyHospital } from "@/domains/surgery/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

/** Page body for hospital screens; the side nav comes from app/hospital/_layout. */
export function HospitalShell({
  title,
  subtitle,
  hospital,
  children,
}: {
  title: string;
  subtitle?: string;
  hospital: MyHospital | null;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const textAlign = isRTL ? "right" : "left";

  return (
    <ScrollView contentContainerStyle={surgeryStyles.page} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground, textAlign }}>{title}</Text>
        {subtitle ? (
          <Text style={{ textAlign }}>
            <Muted>{subtitle}</Muted>
          </Text>
        ) : null}
      </View>
      {hospital && hospital.approval_status !== "approved" ? (
        <Section>
          <Text
            style={{
              color: hospital.approval_status === "rejected" ? colors.destructive : colors.foreground,
              textAlign,
            }}
          >
            {hospital.approval_status === "rejected" ? t.surgery.hospitalRejected : t.surgery.awaitingApproval}
          </Text>
        </Section>
      ) : null}
      {children}
    </ScrollView>
  );
}
