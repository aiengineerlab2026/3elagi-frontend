import { X } from "lucide-react-native";
import React, { useEffect } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAX_SCALE = 4;
const MIN_SCALE = 1;
const VIEW_WIDTH = SCREEN_WIDTH;
const VIEW_HEIGHT = SCREEN_HEIGHT * 0.88;

interface Props {
  uri: string | null;
  onClose: () => void;
}

function clampScale(value: number) {
  "worklet";
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
}

function clampTranslation(tx: number, ty: number, scaleValue: number) {
  "worklet";
  if (scaleValue <= MIN_SCALE) {
    return { x: 0, y: 0 };
  }
  const maxX = Math.max(0, (VIEW_WIDTH * scaleValue - VIEW_WIDTH) / 2);
  const maxY = Math.max(0, (VIEW_HEIGHT * scaleValue - VIEW_HEIGHT) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, tx)),
    y: Math.min(maxY, Math.max(-maxY, ty)),
  };
}

function resetPanWorklet(
  translateX: Animated.SharedValue<number>,
  translateY: Animated.SharedValue<number>,
  savedTranslateX: Animated.SharedValue<number>,
  savedTranslateY: Animated.SharedValue<number>,
) {
  "worklet";
  translateX.value = withTiming(0, { duration: 120 });
  translateY.value = withTiming(0, { duration: 120 });
  savedTranslateX.value = 0;
  savedTranslateY.value = 0;
}

function IosScrollZoomImage({ uri }: { uri: string }) {
  return (
    <ScrollView
      style={styles.scrollZoom}
      contentContainerStyle={styles.scrollZoomContent}
      maximumZoomScale={MAX_SCALE}
      minimumZoomScale={MIN_SCALE}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      centerContent
      bouncesZoom
    >
      <Image source={{ uri }} style={styles.fullImage} resizeMode="contain" />
    </ScrollView>
  );
}

function PinchZoomImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [uri, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = clampScale(savedScale.value * event.scale);
    })
    .onEnd(() => {
      const next = clampScale(scale.value);
      scale.value = withTiming(next, { duration: 120 });
      savedScale.value = next;

      if (next <= MIN_SCALE) {
        resetPanWorklet(translateX, translateY, savedTranslateX, savedTranslateY);
        return;
      }

      const clamped = clampTranslation(translateX.value, translateY.value, next);
      translateX.value = withTiming(clamped.x, { duration: 120 });
      translateY.value = withTiming(clamped.y, { duration: 120 });
      savedTranslateX.value = clamped.x;
      savedTranslateY.value = clamped.y;
    });

  const pan = Gesture.Pan()
    .maxPointers(1)
    .minDistance(4)
    .onBegin(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value <= MIN_SCALE) return;
      const clamped = clampTranslation(
        savedTranslateX.value + event.translationX,
        savedTranslateY.value + event.translationY,
        scale.value,
      );
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      if (scale.value <= MIN_SCALE) return;
      const clamped = clampTranslation(translateX.value, translateY.value, scale.value);
      translateX.value = withTiming(clamped.x, { duration: 120 });
      translateY.value = withTiming(clamped.y, { duration: 120 });
      savedTranslateX.value = clamped.x;
      savedTranslateY.value = clamped.y;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = savedScale.value > 1 ? MIN_SCALE : 2;
      scale.value = withTiming(next, { duration: 180 });
      savedScale.value = next;
      if (next <= MIN_SCALE) {
        resetPanWorklet(translateX, translateY, savedTranslateX, savedTranslateY);
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.pinchZoomRoot}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.pinchZoomContent, animatedStyle]}>
          <Image source={{ uri }} style={styles.fullImage} resizeMode="contain" />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export function FullscreenImageViewer({ uri, onClose }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={!!uri}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.backdrop}>
          {uri ? (
            Platform.OS === "ios" ? (
              <IosScrollZoomImage uri={uri} />
            ) : (
              <PinchZoomImage key={uri} uri={uri} />
            )
          ) : null}

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
          >
            <X size={26} color="#fff" />
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  scrollZoom: {
    flex: 1,
  },
  scrollZoomContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: SCREEN_HEIGHT,
  },
  pinchZoomRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pinchZoomContent: {
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  fullImage: {
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
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
