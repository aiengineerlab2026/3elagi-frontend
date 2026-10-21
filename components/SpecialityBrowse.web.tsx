import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SpecialityGlassShell } from "@/components/SpecialityGlassShell";
import { UI } from "@/constants/uiTokens";
import type { Speciality } from "@/domains/home/api";
import { specialityLabel } from "@/domains/home/specialityLabel";
import {
  specialityGradient,
  specialityVisual,
} from "@/domains/home/specialityVisuals";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";

const CIRCLE = 88;

function SpecialityTile({
  item,
  onPress,
  tileWidth,
}: {
  item: Speciality;
  onPress: () => void;
  tileWidth: `${number}%`;
}) {
  const colors = useColors();
  const { locale, isRTL } = useI18n();
  const label = specialityLabel(item, locale);
  const { icon: Icon, color, image, imageResizeMode } = specialityVisual(item.nameEn);
  const illustration = image ?? (item.imageUrl ? { uri: item.imageUrl } : null);
  const illustrationFit = imageResizeMode ?? "contain";
  const isArabic = locale === "ar";
  const [hovered, setHovered] = useState(false);

  return (
    <View style={[styles.tile, { width: tileWidth }]}>
      <Pressable
        onPress={onPress}
        // @ts-expect-error RN Web hover
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.88 : 1 }]}
      >
        {illustration ? (
          <View
            style={[
              styles.circle,
              styles.circleGlass,
              styles.circleZoom,
              {
                backgroundColor: `${color}18`,
                borderColor: `${color}55`,
                transform: [{ scale: hovered ? 1.1 : 1 }],
                zIndex: hovered ? 2 : 0,
              },
              hovered && {
                ...Platform.select({
                  web: { boxShadow: `0 10px 28px ${color}35` } as object,
                  default: {},
                }),
              },
            ]}
          >
            <Image
              source={illustration}
              style={[
                styles.illustration,
                { transform: [{ scale: hovered ? 1.06 : 1 }] },
              ]}
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
              styles.circleZoom,
              {
                borderColor: `${color}55`,
                transform: [{ scale: hovered ? 1.1 : 1 }],
                zIndex: hovered ? 2 : 0,
              },
              hovered && {
                ...Platform.select({
                  web: { boxShadow: `0 10px 28px ${color}35` } as object,
                  default: {},
                }),
              },
            ]}
          >
            <Icon size={32} color="#fff" />
          </LinearGradient>
        )}
        <Text
          style={[
            styles.primaryLabel,
            {
              color: colors.foreground,
              fontSize: isArabic ? 17 : 14,
              lineHeight: isArabic ? 24 : 20,
              writingDirection: isRTL ? "rtl" : "ltr",
            },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
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
  const { gridColumns } = useWebLayout();
  const columns = Math.max(gridColumns, 3);
  const tileWidth = `${100 / columns}%` as `${number}%`;
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
              fontSize: isArabic ? 24 : 20,
              writingDirection: isRTL ? "rtl" : "ltr",
            },
          ]}
        >
          {heading}
        </Text>
      </View>
      <View style={styles.grid}>
        {specialities.map((item) => (
          <SpecialityTile
            key={item.id}
            item={item}
            tileWidth={tileWidth}
            onPress={() => onSelect(item)}
          />
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
    marginBottom: 22,
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
    overflow: "visible" as const,
  },
  tile: { paddingVertical: 10, paddingHorizontal: 8, overflow: "visible" as const },
  pressable: {
    alignItems: "center",
    cursor: "pointer" as "auto",
    ...UI.pressable,
  },
  circleZoom: Platform.select({
    web: {
      transition: "transform 0.22s ease, box-shadow 0.22s ease",
    } as object,
    default: {},
  }),
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 10,
  },
  circleGlass: Platform.select({
    web: {
      backdropFilter: "blur(8px) saturate(140%)",
      WebkitBackdropFilter: "blur(8px) saturate(140%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
    } as object,
    default: {},
  }),
  illustration: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
    ...Platform.select({
      web: { transition: "transform 0.22s ease" } as object,
      default: {},
    }),
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
