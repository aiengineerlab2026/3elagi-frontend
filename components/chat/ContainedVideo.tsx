import { ResizeMode, Video } from "expo-av";
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
  const videoRef = useRef<Video>(null);

  useImperativeHandle(ref, () => ({
    play: async () => {
      await videoRef.current?.playAsync();
    },
    pause: () => {
      void videoRef.current?.pauseAsync();
    },
  }));

  return (
    <View style={[styles.shell, { width, height }]}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.videoBox}
        videoStyle={styles.videoInner}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls={controls}
        shouldPlay={false}
        isLooping={false}
        onLoad={onLoaded}
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded && status.didJustFinish) {
            onEnded?.();
          }
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  shell: {
    backgroundColor: "#000",
    overflow: "hidden",
    borderRadius: 12,
  },
  videoBox: {
    width: "100%",
    height: "100%",
  },
  videoInner: {
    width: "100%",
    height: "100%",
  },
});
