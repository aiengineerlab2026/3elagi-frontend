import React from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { CircledCountryFlag } from "@/components/country/CircledCountryFlag";

type Props = {
  name: string;
  country?: string | null;
  nameStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  numberOfLines?: number;
  /** LTR: flag then name. RTL: name then flag (still reads naturally). */
  isRTL?: boolean;
  /** Flag diameter. */
  flagSize?: number;
};

/** Peer/doctor name with a circular residence-country flag badge. */
export function NameWithCountryFlag({
  name,
  country,
  nameStyle,
  style,
  numberOfLines = 1,
  isRTL = false,
  flagSize = 18,
}: Props) {
  const code = country?.trim().toUpperCase() ?? "";
  const hasFlag = /^[A-Z]{2}$/.test(code);

  if (!hasFlag) {
    return (
      <Text style={nameStyle} numberOfLines={numberOfLines}>
        {name}
      </Text>
    );
  }

  return (
    <View
      style={[
        styles.row,
        { flexDirection: isRTL ? "row-reverse" : "row" },
        style,
      ]}
    >
      <CircledCountryFlag country={code} size={flagSize} />
      <Text style={[styles.name, nameStyle]} numberOfLines={numberOfLines}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    flexShrink: 1,
  },
  name: {
    flexShrink: 1,
    minWidth: 0,
  },
});
