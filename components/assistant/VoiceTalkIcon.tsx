import React from "react";
import Svg, { Rect } from "react-native-svg";
import { View, type ViewStyle } from "react-native";

interface Props {
  size?: number;
  /** Circle background color. */
  backgroundColor?: string;
  /** Waveform bar color. */
  color?: string;
  style?: ViewStyle;
}

/** Four-bar waveform in a circle — voice talk mode. */
export function VoiceTalkIcon({
  size = 40,
  backgroundColor = "#4b5563",
  color = "#ffffff",
  style,
}: Props) {
  const barWidth = size * 0.09;
  const gap = size * 0.07;
  const centerY = size / 2;
  const heights = [size * 0.28, size * 0.44, size * 0.44, size * 0.28];
  const totalBarsWidth = heights.length * barWidth + (heights.length - 1) * gap;
  let x = (size - totalBarsWidth) / 2;

  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Rect
          x={0}
          y={0}
          width={size}
          height={size}
          rx={size / 2}
          fill={backgroundColor}
        />
        {heights.map((h, i) => {
          const rect = (
            <Rect
              key={i}
              x={x}
              y={centerY - h / 2}
              width={barWidth}
              height={h}
              rx={barWidth / 2}
              fill={color}
            />
          );
          x += barWidth + gap;
          return rect;
        })}
      </Svg>
    </View>
  );
}
