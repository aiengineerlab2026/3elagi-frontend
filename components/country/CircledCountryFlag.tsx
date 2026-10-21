import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import { CIRCLE_FLAG_SVGS } from "@/constants/circleFlagSvgs";

type Props = {
  country?: string | null;
  /** Outer circle diameter. Default 36. */
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Circular country flag badge — flag fills a round emblem (not a rectangular emoji).
 */
export function CircledCountryFlag({ country, size = 36, style }: Props) {
  const code = country?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{2}$/.test(code)) return null;

  const bundled = CIRCLE_FLAG_SVGS[code];
  const radius = size / 2;

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
        style,
      ]}
      accessibilityLabel={code}
    >
      {bundled ? (
        <SvgXml xml={bundled} width={size} height={size} />
      ) : (
        <Image
          source={{ uri: `https://flagcdn.com/w160/${code.toLowerCase()}.png` }}
          style={{ width: size, height: size, borderRadius: radius }}
          contentFit="cover"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});
