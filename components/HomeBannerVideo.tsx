import { ResizeMode, Video } from "expo-av";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const BANNER_VIDEO = require("../assets/banner_video.mp4");
/** Design frame for stretch; height is floored at 30% of the viewport on native. */
const BANNER_W = 1200;
const BANNER_H = 320;
const BANNER_RATIO = BANNER_H / BANNER_W;
const MIN_VIEWPORT_FRACTION = 0.3;

/** Home hero: local looping muted banner video (replaces ad image carousel). */
export function HomeBannerVideo({ embedded = false }: { embedded?: boolean }) {
  const colors = useColors();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [playerKey, setPlayerKey] = useState(0);
  const firstFocus = useRef(true);

  // Returning to the tab left the player loaded-but-not-playing, showing the
  // grey backdrop. Rather than poke it with playAsync (which rejects in some
  // states and silently leaves it blank), remount it: a fresh <Video shouldPlay>
  // is exactly the path that works on first render. The initial focus is
  // skipped so startup still mounts the player only once.
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      setPlayerKey((key) => key + 1);
    }, []),
  );

  const horizontalPadding = embedded ? 0 : 16;
  const contentWidth = embedded
    ? 0
    : Math.max(280, windowWidth - horizontalPadding * 2);
  const ratioHeight = embedded ? 0 : Math.round(contentWidth * BANNER_RATIO);
  const bannerHeight = embedded
    ? undefined
    : Math.max(ratioHeight, Math.round(windowHeight * MIN_VIEWPORT_FRACTION));

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
        <Video
          key={playerKey}
          source={BANNER_VIDEO}
          style={styles.video}
          resizeMode={embedded ? ResizeMode.COVER : ResizeMode.STRETCH}
          shouldPlay
          isLooping
          isMuted
          volume={0}
          useNativeControls={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8, paddingBottom: 4 },
  embedWrap: {
    width: "100%",
    height: "100%",
  },
  hero: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroEmbedded: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  video: {
    width: "100%",
    height: "100%",
  },
});
