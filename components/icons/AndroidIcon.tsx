import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

interface Props {
  size?: number;
  color: string;
}

/** Standard Android robot mark — used beside mobile download links. */
export function AndroidIcon({ size = 18, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" accessibilityLabel="Android">
      <Path
        d="M168 14 L196 58 M344 14 L316 58"
        stroke={color}
        strokeWidth={14}
        strokeLinecap="round"
      />
      <Path d="M118 158 A138 138 0 0 1 394 158 Z" fill={color} />
      <Circle cx={190} cy={96} r={14} fill="#ffffff" />
      <Circle cx={322} cy={96} r={14} fill="#ffffff" />
      <Rect x={36} y={168} width={58} height={188} rx={29} fill={color} />
      <Rect x={418} y={168} width={58} height={188} rx={29} fill={color} />
      <Rect x={118} y={172} width={276} height={232} rx={24} fill={color} />
      <Rect x={118} y={172} width={276} height={40} fill={color} />
      <Rect x={172} y={382} width={60} height={118} rx={30} fill={color} />
      <Rect x={280} y={382} width={60} height={118} rx={30} fill={color} />
    </Svg>
  );
}
