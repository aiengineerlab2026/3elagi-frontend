import React from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { DoctorProfileAboutSection } from "@/components/doctor/DoctorProfileAboutSection";
import { DoctorProfileLocationSection } from "@/components/doctor/DoctorProfileLocationSection";
import { DoctorProfileProfessionalSection } from "@/components/doctor/DoctorProfileProfessionalSection";
import { DoctorProfileReviewsSection } from "@/components/doctor/DoctorProfileReviewsSection";
import {
  hasDoctorAboutSection,
  hasDoctorLocationSection,
  hasDoctorProfessionalSection,
} from "@/components/doctor/doctorProfileSections";
import { UI } from "@/constants/uiTokens";
import type {
  DoctorReviewItem,
  DoctorReviewStatus,
  PublicDoctorProfile,
} from "@/domains/doctor/api";
import { useWebLayout } from "@/hooks/useWebLayout";

type ReviewProps = {
  reviews: DoctorReviewItem[];
  reviewTotal: number;
  reviewStatus: DoctorReviewStatus | null;
  isPatient: boolean;
  reviewRating: number;
  onReviewRatingChange: (n: number) => void;
  reviewComment: string;
  onReviewCommentChange: (s: string) => void;
  submitting: boolean;
  onSubmitReview: () => void;
  reviewColumns?: number;
};

type Props = {
  doctor: PublicDoctorProfile;
  specialtyLabel: string;
} & ReviewProps;

function sectionsGridStyle(twoCol: boolean): ViewStyle {
  if (!twoCol) {
    return { flexDirection: "column", gap: UI.space.md };
  }
  return {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: UI.space.md,
    alignItems: "stretch",
  } as unknown as ViewStyle;
}

export function DoctorProfileBody({
  doctor,
  specialtyLabel,
  ...reviewProps
}: Props) {
  const { isMobile } = useWebLayout();
  const twoCol = !isMobile;

  const sectionDefs: { key: string; node: React.ReactNode }[] = [];

  if (hasDoctorAboutSection(doctor)) {
    sectionDefs.push({
      key: "about",
      node: <DoctorProfileAboutSection doctor={doctor} />,
    });
  }

  if (hasDoctorProfessionalSection(doctor, specialtyLabel)) {
    sectionDefs.push({
      key: "professional",
      node: (
        <DoctorProfileProfessionalSection doctor={doctor} specialtyLabel={specialtyLabel} />
      ),
    });
  }

  if (hasDoctorLocationSection(doctor)) {
    sectionDefs.push({
      key: "location",
      node: (
        <DoctorProfileLocationSection
          clinic={doctor.clinic}
          profileLocation={doctor.location}
        />
      ),
    });
  }

  const spanLast = twoCol && sectionDefs.length % 2 === 1;

  return (
    <View style={styles.root}>
      {sectionDefs.length > 0 ? (
        <View style={sectionsGridStyle(twoCol)}>
          {sectionDefs.map((section, index) => {
            const fullWidth = spanLast && index === sectionDefs.length - 1;
            return (
              <View
                key={section.key}
                style={[styles.cell, fullWidth ? styles.cellFull : null]}
              >
                {section.node}
              </View>
            );
          })}
        </View>
      ) : null}
      <DoctorProfileReviewsSection {...reviewProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: UI.space.md,
    minWidth: 0,
  },
  cell: {
    minWidth: 0,
    width: "100%",
  },
  cellFull: Platform.select({
    web: { gridColumn: "1 / -1" } as ViewStyle,
    default: {},
  }),
});
