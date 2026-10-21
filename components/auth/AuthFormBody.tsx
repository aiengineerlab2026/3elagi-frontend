import React from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  bottomOffset?: number;
};

/**
 * Body of an auth form.
 *
 * Web scrolls here, as it always has. Native does not: the auth card wants to
 * size itself to the form, and a ScrollView reports no intrinsic height, so a
 * card wrapped around one either collapses or has to be given a fixed height —
 * which is what left the empty space below the fields. Scrolling moves up to
 * AuthLoginBackground, leaving the form as plain content the card can measure.
 */
export function AuthFormBody({
  children,
  style,
  contentContainerStyle,
  bottomOffset = 32,
}: Props) {
  if (Platform.OS === "web") {
    return (
      <KeyboardSafeScrollView
        style={style}
        contentContainerStyle={contentContainerStyle}
        bottomOffset={bottomOffset}
      >
        {children}
      </KeyboardSafeScrollView>
    );
  }

  return <View style={contentContainerStyle}>{children}</View>;
}
