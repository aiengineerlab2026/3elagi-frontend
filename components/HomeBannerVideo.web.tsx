import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useWebLayout } from "@/hooks/useWebLayout";

// Metro resolves this to a public URL string on web.
const BANNER_VIDEO = require("../assets/banner_video.mp4") as string | number;

/** Design frame — video is stretched to fill; mobile web floors at 30% viewport. */
const BANNER_W = 1200;
const BANNER_H = 320;
const BANNER_RATIO = BANNER_H / BANNER_W;
const MIN_VIEWPORT_FRACTION = 0.3;

/** Home hero (web): local looping muted banner video (replaces ad image carousel). */
export function HomeBannerVideo({ embedded = false }: { embedded?: boolean }) {
  const colors = useColors();
  const { width, height: windowHeight } = useWindowDimensions();
  const { isDesktop } = useWebLayout();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Back navigation restores the page with the element paused (and autoplay
  // only ever fires once), which left an empty banner box.
  useFocusEffect(
    useCallback(() => {
      const play = () => {
        const el = videoRef.current;
        if (el?.paused) void el.play().catch(() => undefined);
      };
      play();
      document.addEventListener("visibilitychange", play);
      return () => document.removeEventListener("visibilitychange", play);
    }, []),
  );

  const horizontalPadding = embedded ? 0 : isDesktop ? 24 : 16;
  const bannerWidth = embedded ? 0 : Math.max(280, width - horizontalPadding * 2);
  const ratioHeight = embedded ? 0 : Math.round(bannerWidth * BANNER_RATIO);
  const bannerHeight = embedded
    ? undefined
    : Math.max(
        ratioHeight,
        isDesktop ? BANNER_H : Math.round(windowHeight * MIN_VIEWPORT_FRACTION),
      );

  const src = useMemo(() => {
    if (typeof BANNER_VIDEO === "string") return BANNER_VIDEO;
    return String(BANNER_VIDEO);
  }, []);

  return (
    <View style={[embedded ? styles.embedWrap : styles.wrap, !embedded && { paddingHorizontal: horizontalPadding }]}>
      <View
        style={[
          styles.hero,
          embedded && styles.heroEmbedded,
          embedded
            ? undefined
            : {
                width: "100%",
                height: bannerHeight,
                borderColor: colors.border,
                backgroundColor: colors.muted,
              },
        ]}
      >
        {React.createElement("video", {
          ref: videoRef,
          src,
          autoPlay: true,
          muted: true,
          loop: true,
          playsInline: true,
          style: {
            width: "100%",
            height: "100%",
            objectFit: embedded ? "contain" : "fill",
            display: "block",
          },
          "aria-label": "3elagi banner",
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  embedWrap: {
    width: "100%",
    height: "100%",
  },
  hero: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  heroEmbedded: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
});
