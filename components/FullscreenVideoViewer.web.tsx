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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const stageWidth = Math.max(0, screenW - insets.left - insets.right);
  const stageHeight = Math.max(0, screenH - insets.top - insets.bottom);

  useEffect(() => {
    if (!uri) return;
    void videoRef.current?.play().catch(() => undefined);
    return () => {
      videoRef.current?.pause();
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
            <video
              ref={videoRef}
              src={uri}
              playsInline
              controls
              style={{
                ...videoStyle,
                maxWidth: stageWidth,
                maxHeight: stageHeight,
              }}
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

const videoStyle: React.CSSProperties = {
  width: "auto",
  height: "auto",
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
  display: "block",
  backgroundColor: "#000",
  margin: "auto",
};

const styles = StyleSheet.create({
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    backgroundColor: "rgba(0,0,0,0.96)",
    boxSizing: "border-box",
  } as object,
  stage: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    overflow: "hidden",
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
