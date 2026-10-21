import { Image } from "expo-image";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  clampDotAnchor,
  ZONE_DOT_ANCHORS,
} from "@/components/records/bodyDotAnchors";
import {
  HIT_ORDER,
  ZONE_BBOXES,
  zoneAtViewPoint,
} from "@/components/records/bodyPartHitTest";
import {
  ANATOMY_VIEWBOX,
  PART_PATHS,
  ZONE_PATHS,
} from "@/components/records/bodyPartShapes";
import { ZONE_ACCENT } from "@/components/records/bodyZoneAccents";
import { RecordPulseDot } from "@/components/records/RecordPulseDot";
import {
  zoneForBodyPart,
  type BodyPart,
  type BodyZone,
} from "@/domains/medical/bodyParts";

/** Transparent anatomy PNG — skeleton + organs. */
const BODY_SRC = require("@/assets/images/body-anatomy.png");

export const ANATOMY_ASSET_W = ANATOMY_VIEWBOX.w;
export const ANATOMY_ASSET_H = ANATOMY_VIEWBOX.h;

export type ZoneTapAnchor = { x: number; y: number };

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type Props = {
  width: number;
  height: number;
  zoneLabels: Record<BodyZone, string>;
  onSelectZone: (zone: BodyZone, anchor: ZoneTapAnchor) => void;
  /** Mobile / mobile-web: fill the slot; still keeps anatomy aspect (letterbox). */
  compact?: boolean;
  /** Organs with records — rolled up to one dot per body area. */
  partsWithRecords?: ReadonlySet<BodyPart>;
  /** Zones that already have medical records — show one indicator per zone. */
  zonesWithRecords?: ReadonlySet<BodyZone>;
  /** Body area to outline with a free-form path highlight. */
  highlightedZone?: BodyZone | null;
  /** Specific organ highlight (preferred over zone when set). */
  highlightedPart?: BodyPart | null;
};

export function BodyAnatomyFigure({
  width,
  height,
  zoneLabels,
  onSelectZone,
  compact = false,
  partsWithRecords,
  zonesWithRecords,
  highlightedZone = null,
  highlightedPart = null,
}: Props) {
  const slotW = Math.max(1, Math.round(width));
  const slotH = Math.max(1, Math.round(height));

  // Uniform scale so hit overlays stay locked to the PNG pixels.
  const scale = Math.min(slotH / ANATOMY_ASSET_H, slotW / ANATOMY_ASSET_W);
  const drawW = Math.max(1, Math.round(ANATOMY_ASSET_W * scale));
  const drawH = Math.max(1, Math.round(ANATOMY_ASSET_H * scale));
  const sx = drawW / ANATOMY_VIEWBOX.w;
  const sy = drawH / ANATOMY_VIEWBOX.h;

  const recordDots = useMemo(() => {
    const zones = new Set<BodyZone>(zonesWithRecords ?? []);
    if (partsWithRecords?.size) {
      for (const part of partsWithRecords) {
        const zone = zoneForBodyPart(part);
        if (zone) zones.add(zone);
      }
    }
    if (!zones.size) return [];

    return HIT_ORDER.filter((zone) => zones.has(zone)).map((zone) => {
      const anchor = clampDotAnchor(ZONE_DOT_ANCHORS[zone]);
      return {
        key: zone,
        left: Math.round(anchor.x * sx),
        top: Math.round(anchor.y * sy),
      };
    });
  }, [partsWithRecords, zonesWithRecords, sx, sy]);

  const highlight = useMemo(() => {
    if (highlightedPart && highlightedPart !== "general") {
      const partZone = zoneForBodyPart(highlightedPart);
      const partPath = PART_PATHS[highlightedPart];
      // Prefer organ shape only when it matches the active area (avoid stale organ).
      if (
        partPath &&
        partZone &&
        (!highlightedZone || partZone === highlightedZone)
      ) {
        return { d: partPath, accent: ZONE_ACCENT[partZone] };
      }
    }
    if (highlightedZone) {
      return {
        d: ZONE_PATHS[highlightedZone],
        accent: ZONE_ACCENT[highlightedZone],
      };
    }
    return null;
  }, [highlightedPart, highlightedZone]);

  return (
    <View
      style={[
        styles.figureWrap,
        compact && styles.figureWrapCompact,
        { width: compact ? slotW : drawW, height: compact ? slotH : drawH },
      ]}
    >
      <View style={{ width: drawW, height: drawH }}>
        <Image
          source={BODY_SRC}
          style={{ width: drawW, height: drawH }}
          contentFit="contain"
          pointerEvents="none"
        />

        {highlight ? (
          <Svg
            width={drawW}
            height={drawH}
            viewBox={`0 0 ${ANATOMY_VIEWBOX.w} ${ANATOMY_VIEWBOX.h}`}
            style={styles.highlightSvg}
            pointerEvents="none"
          >
            <Path
              d={highlight.d}
              fill={hexToRgba(highlight.accent, 0.32)}
              stroke={highlight.accent}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </Svg>
        ) : null}

        {HIT_ORDER.map((zone, index) => {
          const box = ZONE_BBOXES[zone];
          const left = Math.round(box.minX * sx);
          const top = Math.round(box.minY * sy);
          const w = Math.max(16, Math.round((box.maxX - box.minX) * sx));
          const h = Math.max(16, Math.round((box.maxY - box.minY) * sy));
          const selected =
            highlightedZone === zone ||
            (highlightedPart != null &&
              highlightedPart !== "general" &&
              zoneForBodyPart(highlightedPart) === zone);
          return (
            <Pressable
              key={`hit-${zone}`}
              accessibilityRole="button"
              accessibilityLabel={zoneLabels[zone]}
              accessibilityState={{ selected }}
              hitSlop={4}
              onPress={(e) => {
                const { pageX, pageY, locationX, locationY } = e.nativeEvent;
                let nextZone: BodyZone = zone;
                if (
                  typeof locationX === "number" &&
                  typeof locationY === "number" &&
                  Number.isFinite(locationX) &&
                  Number.isFinite(locationY)
                ) {
                  const viewX = box.minX + locationX / sx;
                  const viewY = box.minY + locationY / sy;
                  nextZone = zoneAtViewPoint(viewX, viewY) ?? zone;
                }
                onSelectZone(nextZone, {
                  x: typeof pageX === "number" ? pageX : left + w / 2,
                  y: typeof pageY === "number" ? pageY : top + h / 2,
                });
              }}
              style={{
                position: "absolute",
                left,
                top,
                width: w,
                height: h,
                zIndex: 10 + index,
                // Invisible hit target only — visual highlight is the SVG path.
                backgroundColor: "rgba(0,0,0,0.001)",
              }}
            />
          );
        })}

        {recordDots.map((dot) => (
          <RecordPulseDot
            key={`dot-${dot.key}`}
            size="lg"
            left={dot.left}
            top={dot.top}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  figureWrap: {
    position: "relative",
    alignSelf: "center",
    backgroundColor: "transparent",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  figureWrapCompact: {
    width: "100%",
  },
  highlightSvg: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
});
