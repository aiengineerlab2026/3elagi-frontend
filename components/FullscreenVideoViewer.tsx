import { ResizeMode, Video } from "expo-av";
import { X } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  uri: string | null;
  onClose: () => void;
}

export function FullscreenVideoViewer({ uri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const videoRef = useRef<Video>(null);

  const stageWidth = Math.max(0, screenW - insets.left - insets.right);
  const stageHeight = Math.max(0, screenH - insets.top - insets.bottom);

  useEffect(() => {
    if (!uri) return;
    void videoRef.current?.playAsync().catch(() => undefined);
    return () => {
      void videoRef.current?.stopAsync().catch(() => undefined);
      void videoRef.current?.unloadAsync().catch(() => undefined);
    };
  }, [uri]);

  return (
    <Modal
      visible={!!uri}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <View
        style={[
          styles.overlay,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <View style={[styles.stage, { width: stageWidth, height: stageHeight }]}>
          {uri ? (
            <Video
              ref={videoRef}
              source={{ uri }}
              style={{ width: stageWidth, height: stageHeight }}
              videoStyle={styles.videoInner}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay
              isLooping={false}
            />
          ) : null}
        </View>

        <Pressable
          onPress={onClose}
          style={[
            styles.closeBtn,
            {
              top: insets.top + 12,
              right: insets.right + 12,
            },
          ]}
          hitSlop={12}
          accessibilityLabel="Close"
        >
          <X size={26} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
  },
  stage: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoInner: {
    width: "100%",
    height: "100%",
  },
  closeBtn: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
