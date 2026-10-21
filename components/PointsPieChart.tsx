import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import type { PointsSummary } from "@/domains/points/api";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { flexRow } from "@/utils/rtl";

interface Props {
  summary: PointsSummary;
  size?: number;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx: number, cy: number, r: number, start: number, end: number) {
  if (end - start >= 360) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  }
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} Z`;
}

export function PointsPieChart({ summary, size = 220 }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const inner = size * 0.26;

  const { available, spent, total } = useMemo(() => {
    const availablePts = Math.max(0, summary.message_points);
    const spentPts = Math.max(0, summary.points_spent_total);
    const totalPts = availablePts + spentPts;
    return { available: availablePts, spent: spentPts, total: totalPts };
  }, [summary]);

  const slices = useMemo(() => {
    if (total <= 0) {
      return [{ d: slicePath(cx, cy, r, 0, 360), fill: colors.muted }];
    }
    const availableAngle = (available / total) * 360;
    const spentAngle = 360 - availableAngle;
    const out: { d: string; fill: string }[] = [];
    if (available > 0) {
      out.push({ d: slicePath(cx, cy, r, 0, availableAngle), fill: colors.primary });
    }
    if (spent > 0) {
      out.push({
        d: slicePath(cx, cy, r, availableAngle, availableAngle + spentAngle),
        fill: `${colors.mutedForeground}55`,
      });
    }
    return out;
  }, [available, spent, total, cx, cy, r, colors]);

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <G>
          {slices.map((slice, i) => (
            <Path key={i} d={slice.d} fill={slice.fill} />
          ))}
          <Path d={slicePath(cx, cy, inner, 0, 360)} fill={colors.card} />
        </G>
      </Svg>
      <View style={[styles.centerLabel, { width: size, height: size }]}>
        <Text style={[styles.balance, { color: colors.foreground }]}>{available}</Text>
        <Text style={[styles.balanceHint, { color: colors.mutedForeground }]}>
          {t.credits.creditsLeft}
        </Text>
      </View>
      <View style={[styles.legend, { flexDirection: dir }]}>
        <View style={[styles.legendItem, { flexDirection: dir }]}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={{ color: colors.foreground, fontSize: 13 }}>
            {t.credits.availableLegend(available)}
          </Text>
        </View>
        <View style={[styles.legendItem, { flexDirection: dir }]}>
          <View style={[styles.dot, { backgroundColor: `${colors.mutedForeground}55` }]} />
          <Text style={{ color: colors.foreground, fontSize: 13 }}>
            {t.credits.usedLegend(spent)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 16 },
  centerLabel: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  balance: { fontSize: 36, fontWeight: "800" },
  balanceHint: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  legend: { gap: 16, flexWrap: "wrap", justifyContent: "center" },
  legendItem: { alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
