import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

const PERIOD = 1440;
const VIEWBOX_HEIGHT = 220;
const LANDING_WAVE_MAX_HEIGHT = 200;

function wavePath(crest: number, trough: number, base: number): string {
  const half = PERIOD / 2;
  const seg = (x: number) =>
    `C ${x + half / 3} ${crest} ${x + (half * 2) / 3} ${crest} ${x + half} ${base}` +
    ` C ${x + half + half / 3} ${trough} ${x + half + (half * 2) / 3} ${trough} ${x + PERIOD} ${base}`;
  return `M0 ${base} ${seg(0)} L${PERIOD} ${VIEWBOX_HEIGHT} L0 ${VIEWBOX_HEIGHT} Z`;
}

const LAYERS = [
  { id: "wave-back", d: wavePath(56, 150, 104), opacity: 0.22 },
  { id: "wave-mid", d: wavePath(104, 178, 140), opacity: 0.3 },
  { id: "wave-front", d: wavePath(150, 200, 174), opacity: 0.42 },
];

/** Glassy water footer — scrolls with the page; sticks to the bottom when content is short. */
export function LandingWaveFooter() {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const height = Math.round(
    Math.min(LANDING_WAVE_MAX_HEIGHT, Math.max(120, width * (VIEWBOX_HEIGHT / PERIOD) * 1.6)),
  );

  return (
    <View
      style={[styles.wrap, { height: width ? height : LANDING_WAVE_MAX_HEIGHT }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      pointerEvents="none"
    >
      {width
        ? LAYERS.map((layer) => (
            <View key={layer.id} style={styles.layer}>
              <Svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${PERIOD} ${VIEWBOX_HEIGHT}`}
                preserveAspectRatio="none"
              >
                <Defs>
                  <LinearGradient id={layer.id} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#ffffff" stopOpacity={0.55} />
                    <Stop offset="0.45" stopColor={colors.primary} stopOpacity={0.35} />
                    <Stop offset="1" stopColor={colors.primary} stopOpacity={0.85} />
                  </LinearGradient>
                </Defs>
                <Path d={layer.d} fill={`url(#${layer.id})`} opacity={layer.opacity} />
              </Svg>
            </View>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignSelf: "stretch",
    marginTop: "auto",
    marginBottom: 0,
    overflow: "hidden",
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
});
