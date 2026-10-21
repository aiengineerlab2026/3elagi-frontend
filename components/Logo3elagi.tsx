import React from "react";
import { Platform, Text, View, type ViewStyle } from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import { SHOW_BETA_BADGE } from "@/constants/brand";
import { useColors } from "@/hooks/useColors";
import { useWebLayout } from "@/hooks/useWebLayout";

interface Props {
  height?: number;
  dark?: boolean;
  /** Icon mark only (no wordmark). */
  markOnly?: boolean;
  /** When true, wraps SVG in a full-width centered container (fixes visual offset). */
  centered?: boolean;
  /** Show BETA pill beside the wordmark (defaults to SHOW_BETA_BADGE on web). */
  showBeta?: boolean;
  style?: ViewStyle;
}

/** Warm amber — distinct from blue/green/red logo accents. */
const BETA_BADGE = {
  light: {
    background: "#F59E0B",
    border: "#D97706",
    text: "#FFFFFF",
  },
  dark: {
    background: "#FBBF24",
    border: "#F59E0B",
    text: "#78350F",
  },
} as const;

/** End of "3elagi" wordmark in viewBox units (x=98, fontSize=58). */
const LOGO_WORDMARK_END_X = 281;
/** SVG viewBox width — cropped tight to the wordmark when Beta is shown. */
const LOGO_VIEWBOX_WIDTH = 360;
const LOGO_VIEWBOX_WIDTH_WITH_BETA = LOGO_WORDMARK_END_X + 2;

function BetaBadge({
  height,
  dark,
  superscript = false,
}: {
  height: number;
  dark: boolean;
  superscript?: boolean;
}) {
  const scale =
    Math.max(0.72, Math.min(1.1, height / 44)) * (superscript ? 0.88 : 1);
  const palette = dark ? BETA_BADGE.dark : BETA_BADGE.light;
  const shadowBlur = 6 * scale;
  const shadowY = 2 * scale;

  return (
    <View
      style={{
        paddingHorizontal: 6 * scale,
        paddingVertical: 2.5 * scale,
        borderRadius: 6 * scale,
        backgroundColor: palette.background,
        borderWidth: 1,
        borderColor: palette.border,
        ...Platform.select({
          web: {
            boxShadow: `0 ${shadowY}px ${shadowBlur}px rgba(217, 119, 6, 0.42), 0 1px 2px rgba(0, 0, 0, 0.14)`,
          } as object,
          default: {
            shadowColor: "#D97706",
            shadowOffset: { width: 0, height: shadowY },
            shadowOpacity: 0.42,
            shadowRadius: shadowBlur,
            elevation: 4,
          },
        }),
      }}
      accessibilityLabel="Beta version"
    >
      <Text
        style={{
          fontSize: 9 * scale,
          fontWeight: "800",
          letterSpacing: 0.9,
          color: palette.text,
          textTransform: "uppercase",
        }}
      >
        Beta
      </Text>
    </View>
  );
}
export function Logo3elagi({
  height = 44,
  dark = false,
  markOnly = false,
  centered = false,
  showBeta,
  style,
}: Props) {
  const colors = useColors();
  const { isMobile } = useWebLayout();
  const betaVisible = (showBeta ?? SHOW_BETA_BADGE) && !markOnly;
  // Follows the selected accent (green / blue / red) rather than a fixed brand hex.
  const stroke = dark ? "#ffffff" : colors.primary;
  const fill = dark ? "rgba(255,255,255,0.12)" : `${colors.primary}14`;
  const viewBoxWidth = markOnly
    ? 90
    : betaVisible
      ? LOGO_VIEWBOX_WIDTH_WITH_BETA
      : LOGO_VIEWBOX_WIDTH;
  const ratio = markOnly ? 1 : viewBoxWidth / 90;
  const width = height * ratio;
  const viewBox = markOnly ? "0 0 90 90" : `0 0 ${viewBoxWidth} 90`;

  const svg = (
    <Svg
      width={width}
      height={height}
      viewBox={viewBox}
      fill="none"
      accessibilityLabel="3elagi"
    >
      <Circle cx={45} cy={45} r={42} fill={fill} stroke={stroke} strokeWidth={3} />
      <Path
        d="M 28,38 C 20,38 17,30 22,24 C 26,19 34,20 34,27"
        stroke={stroke}
        strokeWidth={5.5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M 62,38 C 70,38 73,30 68,24 C 64,19 56,20 56,27"
        stroke={stroke}
        strokeWidth={5.5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M 28,38 C 28,48 45,50 45,58"
        stroke={stroke}
        strokeWidth={5.5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M 62,38 C 62,48 45,50 45,58"
        stroke={stroke}
        strokeWidth={5.5}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={45} cy={65} r={7} stroke={stroke} strokeWidth={4} fill="none" />
      <Circle cx={45} cy={65} r={2.5} fill={stroke} />
      {!markOnly ? (
        <SvgText
          x={98}
          y={62}
          fontFamily="System"
          fontWeight="800"
          fontSize={58}
          fill={stroke}
        >
          3elagi
        </SvgText>
      ) : null}
    </Svg>
  );

  const logoWithBeta = betaVisible ? (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 0,
        direction: "ltr",
      }}
      // @ts-expect-error web writing direction
      dir="ltr"
    >
      {svg}
      <View style={{ marginTop: height * 0.12 }}>
        <BetaBadge height={height} dark={dark} superscript />
      </View>
    </View>
  ) : (
    svg
  );
  // Always LTR so RTL page direction never mirrors/clips the wordmark (e.g. "lagi").
  const shell = (
    <View
      style={[{ direction: "ltr" }, style]}
      // @ts-expect-error web writing direction
      dir="ltr"
    >
      {logoWithBeta}
    </View>
  );

  if (!centered) return shell;

  const opticalOffsetX = markOnly || isMobile ? 0 : width / 6;

  return (
    <View
      style={[
        {
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          direction: "ltr",
        },
        style,
      ]}
      // @ts-expect-error web writing direction
      dir="ltr"
    >
      <View style={{ transform: [{ translateX: opticalOffsetX }], direction: "ltr" }}>
        {logoWithBeta}
      </View>
    </View>
  );
}
