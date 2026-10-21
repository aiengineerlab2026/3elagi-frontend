import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";

export type ContainedVideoHandle = {
  play: () => Promise<void>;
  pause: () => void;
};

interface Props {
  uri: string;
  width: number;
  height: number;
  controls?: boolean;
  onLoaded?: () => void;
  onEnded?: () => void;
}

export const ContainedVideo = forwardRef<ContainedVideoHandle, Props>(function ContainedVideo(
  { uri, width, height, controls = false, onLoaded, onEnded },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const aspectRatio = width / height;

  useImperativeHandle(ref, () => ({
    play: async () => {
      if (!videoRef.current) return;
      await videoRef.current.play();
    },
    pause: () => {
      videoRef.current?.pause();
    },
  }));

  const markLoaded = () => onLoaded?.();

  return (
    <View style={[styles.shell, { maxWidth: width, aspectRatio }]}>
      <video
        ref={videoRef}
        src={uri}
        playsInline
        controls={controls}
        preload="metadata"
        onLoadedData={markLoaded}
        onLoadedMetadata={markLoaded}
        onCanPlay={markLoaded}
        onEnded={onEnded}
        onError={markLoaded}
        style={videoStyle}
      />
    </View>
  );
});

const videoStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
  backgroundColor: "#000",
  minWidth: 0,
  minHeight: 0,
  borderRadius: 12,
};

const styles = StyleSheet.create({
  shell: {
    position: "relative",
    width: "100%",
    backgroundColor: "#000",
    overflow: "hidden",
    borderRadius: 12,
    alignSelf: "stretch",
  },
});
