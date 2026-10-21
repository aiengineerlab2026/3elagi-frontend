import { CircleHelp } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";

type Props = {
  text: string;
  title?: string;
  size?: number;
  style?: ViewStyle;
};

/** Info icon — hover tooltip on web, alert dialog on native. */
export function InfoTooltip({ text, title, size = 16, style }: Props) {
  const colors = useColors();
  const [visible, setVisible] = useState(false);

  const onPress = () => {
    Alert.alert(title ?? "", text);
  };

  if (Platform.OS === "web") {
    return (
      <View
        style={[styles.wrap, style]}
        // @ts-expect-error RN Web mouse events
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={text}
          hitSlop={8}
        >
          <CircleHelp size={size} color={colors.mutedForeground} />
        </Pressable>
        {visible ? (
          <View
            style={[
              styles.tooltip,
              {
                backgroundColor: colors.foreground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.tooltipText, { color: colors.background }]}>
              {text}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text}
      hitSlop={8}
      style={style}
    >
      <CircleHelp size={size} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    zIndex: 20,
  },
  tooltip: {
    position: "absolute",
    bottom: "100%",
    left: "50%",
    transform: [{ translateX: -120 }],
    width: 240,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
      default: {},
    }),
  },
  tooltipText: {
    fontSize: 12,
    lineHeight: 17,
  },
});
