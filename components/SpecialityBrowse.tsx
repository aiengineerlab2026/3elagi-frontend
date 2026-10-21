import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SpecialityGlassShell } from "@/components/SpecialityGlassShell";
import type { Speciality } from "@/domains/home/api";
import { specialityLabel } from "@/domains/home/specialityLabel";
import {
  specialityGradient,
  specialityVisual,
} from "@/domains/home/specialityVisuals";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

/** Sized for ≥3 tiles per row on narrow native phones. */
const CIRCLE = 72;
const COLUMNS = 3;

function SpecialityTile({
  item,
  onPress,
}: {
  item: Speciality;
  onPress: () => void;
}) {
  const colors = useColors();
  const { locale, isRTL } = useI18n();
  const label = specialityLabel(item, locale);
  const { icon: Icon, color, image, imageResizeMode } = specialityVisual(item.nameEn);
  const illustration = image ?? (item.imageUrl ? { uri: item.imageUrl } : null);
  const illustrationFit = imageResizeMode ?? "contain";
  const isArabic = locale === "ar";

  const circleVisual = (pressed: boolean) =>
    illustration ? (
      <View
        style={[
          styles.circle,
          {
            backgroundColor: `${color}18`,
            borderColor: `${color}55`,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Image
          source={illustration}
          style={[styles.illustration, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
          resizeMode={illustrationFit}
        />
      </View>
    ) : (
      <LinearGradient
        colors={specialityGradient(color)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.circle,
          styles.orbFallback,
          { borderColor: `${color}55`, transform: [{ scale: pressed ? 0.94 : 1 }] },
        ]}
      >
        <Icon size={28} color="#fff" />
      </LinearGradient>
    );

  return (
    <View style={styles.tile}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.88 : 1 }]}
      >
        {({ pressed }) => (
          <>
            {circleVisual(pressed)}
            <Text
          style={[
            styles.primaryLabel,
            {
              color: colors.foreground,
              fontSize: isArabic ? 16 : 13,
              lineHeight: isArabic ? 22 : 18,
              writingDirection: isRTL ? "rtl" : "ltr",
            },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

interface SpecialityGridProps {
  specialities: Speciality[];
  isRTL: boolean;
  onSelect: (speciality: Speciality) => void;
  /** Directory page: fill the viewport rather than hugging the tiles. */
  fullHeight?: boolean;
}

export function SpecialityGrid({
  specialities,
  isRTL,
  onSelect,
  fullHeight = false,
}: SpecialityGridProps) {
  const colors = useColors();
  const { height: viewportHeight } = useWindowDimensions();
  const { locale } = useI18n();
  const heading =
    locale === "ar"
      ? "التخصصات الطبية"
      : locale === "de"
        ? "Medizinische Fachgebiete"
        : locale === "es"
          ? "Especialidades médicas"
          : "Medical Specialities";

  const isArabic = locale === "ar";

  return (
    <SpecialityGlassShell
      isRTL={isRTL}
      style={fullHeight ? { minHeight: viewportHeight * 0.9 } : undefined}
    >
      <View style={styles.headingRow}>
        <Image
          source={require("@/assets/images/splash-mark.png")}
          style={[styles.logo, { tintColor: colors.primary }]}
          resizeMode="contain"
        />
        <Text
          style={[
            styles.heading,
            {
              color: colors.foreground,
              fontSize: isArabic ? 22 : 18,
              writingDirection: isRTL ? "rtl" : "ltr",
            },
          ]}
        >
          {heading}
        </Text>
      </View>
      <View style={styles.grid}>
        {specialities.map((item) => (
          <SpecialityTile key={item.id} item={item} onPress={() => onSelect(item)} />
        ))}
      </View>
    </SpecialityGlassShell>
  );
}

const styles = StyleSheet.create({
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "nowrap",
    gap: 10,
    marginBottom: 18,
  },
  logo: { width: 26, height: 26, flexShrink: 0, opacity: 0.9 },
  heading: {
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  tile: {
    width: `${100 / COLUMNS}%`,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  pressable: { alignItems: "center" },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 8,
  },
  illustration: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  orbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: {
    fontWeight: "600",
    textAlign: "center",
  },
});
