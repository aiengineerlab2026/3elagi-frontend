import { router, usePathname, type Href } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import {
  currentTourSteps,
  isTourRouteActive,
  tourRouteForStep,
  useProductTourStore,
  type TourStep,
} from "@/domains/onboarding/productTourStore";
import { currentLocalizedTourStep } from "@/domains/onboarding/productTourCopy";
import { invokeTourAnchorHandler } from "@/domains/onboarding/tourAnchorActions";
import {
  measureAnchorOnWeb,
  useTourAnchorStore,
} from "@/domains/onboarding/tourAnchorStore";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText } from "@/utils/rtl";

interface Props {
  onCompleteMain?: () => void;
  onSkip?: () => void;
}

const SPOT_PAD = 6;
const CARD_MAX_WIDTH = 320;
const TOOLTIP_BOTTOM = 28;
const ARROW_SIZE = 8;
const GAP = 10;
const POPOVER_EST_HEIGHT = 196;
const ANIM_MS = 260;

interface SpotlightHole {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ContextualLayout {
  left: number;
  top: number;
  width: number;
  arrowLeft: number;
  arrowUp: boolean;
}

function resolveAnchorRect(anchorId: string) {
  const storedRect = useTourAnchorStore.getState().rects[anchorId];
  if (storedRect && storedRect.width > 0 && storedRect.height > 0) return storedRect;
  if (Platform.OS === "web") return measureAnchorOnWeb(anchorId);
  return null;
}

function spotlightHoleFromRect(rect: { x: number; y: number; width: number; height: number }): SpotlightHole {
  const x = Math.max(0, rect.x - SPOT_PAD);
  const y = Math.max(0, rect.y - SPOT_PAD);
  return {
    x,
    y,
    w: rect.width + SPOT_PAD * 2,
    h: rect.height + SPOT_PAD * 2,
  };
}

function computeContextualLayout(
  anchorId: string,
  screenW: number,
  screenH: number,
  cardW: number,
): ContextualLayout | null {
  const rect = resolveAnchorRect(anchorId);
  if (!rect || rect.width < 1 || rect.height < 1) return null;

  const hole = spotlightHoleFromRect(rect);
  const targetCenterX = hole.x + hole.w / 2;

  const belowTop = hole.y + hole.h + GAP + ARROW_SIZE;
  const fitsBelow = belowTop + POPOVER_EST_HEIGHT < screenH - 16;
  const arrowUp = fitsBelow;
  const top = arrowUp
    ? belowTop
    : Math.max(16, hole.y - POPOVER_EST_HEIGHT - GAP - ARROW_SIZE);

  // Align popover toward the left of wide header buttons so it stays compact.
  let left = hole.x + hole.w - cardW;
  left = Math.max(16, Math.min(left, screenW - cardW - 16));

  const arrowLeft = Math.max(18, Math.min(cardW - 18, targetCenterX - left));

  return { left, top, width: cardW, arrowLeft, arrowUp };
}

function PopoverArrow({
  up,
  offset,
  fill,
  border,
}: {
  up: boolean;
  offset: number;
  fill: string;
  border: string;
}) {
  const shared = { position: "absolute" as const, width: 0, height: 0 };
  if (up) {
    return (
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: -ARROW_SIZE, left: offset - ARROW_SIZE }}
      >
        <View
          style={{
            ...shared,
            borderLeftWidth: ARROW_SIZE,
            borderRightWidth: ARROW_SIZE,
            borderBottomWidth: ARROW_SIZE,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: border,
          }}
        />
        <View
          style={{
            ...shared,
            marginTop: 1,
            borderLeftWidth: ARROW_SIZE,
            borderRightWidth: ARROW_SIZE,
            borderBottomWidth: ARROW_SIZE,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: fill,
          }}
        />
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", bottom: -ARROW_SIZE, left: offset - ARROW_SIZE }}
    >
      <View
        style={{
          ...shared,
          borderLeftWidth: ARROW_SIZE,
          borderRightWidth: ARROW_SIZE,
          borderTopWidth: ARROW_SIZE,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: border,
        }}
      />
      <View
        style={{
          ...shared,
          marginTop: -1,
          borderLeftWidth: ARROW_SIZE,
          borderRightWidth: ARROW_SIZE,
          borderTopWidth: ARROW_SIZE,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: fill,
        }}
      />
    </View>
  );
}

function TourHighlightRing({
  hole,
  absStyle,
}: {
  hole: SpotlightHole;
  absStyle: ViewStyle;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const outerOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5],
  });

  const outerScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  const base = {
    top: hole.y - 5,
    left: hole.x - 5,
    width: hole.w + 10,
    height: hole.h + 10,
  };

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.highlightRingOuter,
          absStyle,
          base,
          { opacity: outerOpacity, transform: [{ scale: outerScale }] },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.highlightRing, absStyle, base, { opacity: ringOpacity }]}
      />
    </>
  );
}

function SpotlightBackdrop({
  anchorId,
  screenW,
  screenH,
}: {
  anchorId: string;
  screenW: number;
  screenH: number;
}) {
  const storedRect = useTourAnchorStore((s) => s.rects[anchorId]);
  const rect = storedRect ?? (Platform.OS === "web" ? measureAnchorOnWeb(anchorId) : null);

  if (!rect || rect.width < 1 || rect.height < 1) {
    return (
      <View
        style={[styles.fullDim, Platform.OS === "web" && styles.absFixed]}
        pointerEvents={Platform.OS === "web" ? "none" : "auto"}
      />
    );
  }

  const hole = spotlightHoleFromRect(rect);
  const { x, y, w, h } = hole;
  const abs = Platform.OS === "web" ? styles.absFixed : styles.abs;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[styles.dim, abs, { top: 0, left: 0, width: screenW, height: y }]} pointerEvents="auto" />
      <View
        style={[styles.dim, abs, { top: y + h, left: 0, width: screenW, height: Math.max(0, screenH - y - h) }]}
        pointerEvents="auto"
      />
      <View style={[styles.dim, abs, { top: y, left: 0, width: x, height: h }]} pointerEvents="auto" />
      <View
        style={[styles.dim, abs, { top: y, left: x + w, width: Math.max(0, screenW - x - w), height: h }]}
        pointerEvents="auto"
      />
      <TourHighlightRing hole={hole} absStyle={abs} />
    </View>
  );
}

function TourOverlayFrame({
  children,
  onRequestClose,
}: {
  children: React.ReactNode;
  onRequestClose: () => void;
}) {
  if (Platform.OS === "web") {
    return (
      <View style={styles.overlayWeb} pointerEvents="box-none">
        {children}
      </View>
    );
  }

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={styles.overlayNative} pointerEvents="box-none">
        {children}
      </View>
    </Modal>
  );
}

function useTourEnterAnim(stepId: string) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(10);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIM_MS,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIM_MS,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  }, [stepId, opacity, translateY]);

  return { opacity, translateY };
}

function ContextualTourPopover({
  step,
  stepIndex,
  totalSteps,
  layout,
  onPrimary,
  onSkip,
  colors,
  skipLabel,
  progressLabel,
  textAlign,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  layout: ContextualLayout;
  onPrimary: () => void;
  onSkip: () => void;
  colors: ReturnType<typeof useColors>;
  skipLabel: string;
  progressLabel: string;
  textAlign: "left" | "right" | "center";
}) {
  const { opacity, translateY } = useTourEnterAnim(step.id);
  const positioned = Platform.OS === "web" ? styles.absFixed : styles.abs;

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLabel={step.title ?? step.message}
      style={[
        positioned,
        {
          left: layout.left,
          top: layout.top,
          width: layout.width,
          zIndex: 100001,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <PopoverArrow
        up={layout.arrowUp}
        offset={layout.arrowLeft}
        fill={colors.card}
        border={colors.border}
      />
      <View
        style={[
          styles.contextCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        pointerEvents="auto"
      >
        <Text style={[styles.contextTitle, { color: colors.foreground, textAlign }]}>
          {step.title ?? step.message}
        </Text>
        {step.description ? (
          <Text style={[styles.contextDescription, { color: colors.mutedForeground, textAlign }]}>
            {step.description}
          </Text>
        ) : null}
        {step.primaryCta ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={step.primaryCta}
            onPress={onPrimary}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.contextPrimaryBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed || hovered ? 0.92 : 1,
              },
            ]}
          >
            <Text style={[styles.contextPrimaryBtnText, { color: colors.primaryForeground }]}>
              {step.primaryCta}
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.contextFooter}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={skipLabel}
            onPress={onSkip}
            style={styles.skipBtn}
          >
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>{skipLabel}</Text>
          </Pressable>
          <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
            {progressLabel}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function BottomTourBar({
  step,
  stepIndex,
  totalSteps,
  screenW,
  cardW,
  onPrimary,
  onSkip,
  colors,
  skipLabel,
  nextLabel,
  progressLabel,
  textAlign,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  screenW: number;
  cardW: number;
  onPrimary: () => void;
  onSkip: () => void;
  colors: ReturnType<typeof useColors>;
  skipLabel: string;
  nextLabel: string;
  progressLabel: string;
  textAlign: "left" | "right" | "center";
}) {
  const { opacity, translateY } = useTourEnterAnim(step.id);
  const positioned = Platform.OS === "web" ? styles.absFixed : styles.abs;

  return (
    <Animated.View
      style={[
        positioned,
        {
          left: Math.max(16, (screenW - cardW) / 2),
          bottom: TOOLTIP_BOTTOM,
          width: cardW,
          zIndex: 100001,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.bottomCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        pointerEvents="auto"
      >
        <Text style={[styles.bottomMessage, { color: colors.foreground, textAlign }]}>
          {step.title ?? step.message}
        </Text>
        {step.description ? (
          <Text
            style={[
              styles.contextDescription,
              { color: colors.mutedForeground, textAlign },
            ]}
          >
            {step.description}
          </Text>
        ) : null}
        {step.primaryCta ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={step.primaryCta}
            onPress={onPrimary}
            style={[styles.contextPrimaryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.contextPrimaryBtnText, { color: colors.primaryForeground }]}>
              {step.primaryCta}
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.contextFooter}>
          <Pressable onPress={onSkip} style={styles.skipBtn} accessibilityLabel={skipLabel}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>{skipLabel}</Text>
          </Pressable>
          <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
            {progressLabel}
          </Text>
          {!step.waitForTap && !step.primaryCta ? (
            <Pressable
              onPress={onPrimary}
              style={[styles.bottomNextBtn, { backgroundColor: colors.primary }]}
              accessibilityLabel={nextLabel}
            >
              <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>{nextLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

/** Spotlight-style tooltip tour for new doctors. */
export function ProductTourOverlay({ onCompleteMain, onSkip }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const textAlign = alignText(isRTL);
  const pathname = usePathname();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const active = useProductTourStore((s) => s.active);
  const phase = useProductTourStore((s) => s.phase);
  const stepIndex = useProductTourStore((s) => s.stepIndex);
  const next = useProductTourStore((s) => s.next);
  const skip = useProductTourStore((s) => s.skip);
  const advanceOnAnchorTap = useProductTourStore((s) => s.advanceOnAnchorTap);
  const testPatientUserId = useProductTourStore((s) => s.testPatientUserId);
  const [, setMeasureTick] = useState(0);

  const step = currentLocalizedTourStep(phase, stepIndex, t.productTour);
  const totalSteps = currentTourSteps(phase).length;
  const progressLabel = t.productTour.progress(stepIndex + 1, totalSteps);
  const anchorRect = useTourAnchorStore((s) =>
    step ? s.rects[step.anchor] : undefined,
  );

  const route = useMemo(
    () => tourRouteForStep(step, testPatientUserId),
    [step, testPatientUserId],
  );

  const cardW = Math.min(CARD_MAX_WIDTH, screenW - 32);
  const isContextual = step?.placement === "contextual";

  const contextualLayout = useMemo(
    () =>
      step && isContextual
        ? computeContextualLayout(step.anchor, screenW, screenH, cardW)
        : null,
    [step, isContextual, screenW, screenH, cardW, anchorRect],
  );

  useEffect(() => {
    if (!active || !route) return;
    if (isTourRouteActive(pathname, route)) return;
    router.push(route as Href);
  }, [active, route, pathname]);

  useEffect(() => {
    if (!active || !step) return;
    const setRect = useTourAnchorStore.getState().setRect;
    const tick = () => {
      const rect = resolveAnchorRect(step.anchor);
      if (rect) setRect(step.anchor, rect);
      setMeasureTick((n) => n + 1);
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [active, step?.anchor, step?.id, anchorRect]);

  if (!active || !step) return null;

  const finish = () => {
    onCompleteMain?.();
    skip();
  };

  const handleSkip = () => {
    onSkip?.();
    skip();
  };

  const handlePrimaryCta = () => {
    invokeTourAnchorHandler(step.anchor);
    if (step.waitForTap) {
      advanceOnAnchorTap(step.anchor);
      return;
    }
    if (stepIndex + 1 >= totalSteps) {
      finish();
      return;
    }
    next();
  };

  const onPrimary = () => {
    if (step.waitForTap) return;
    if (stepIndex + 1 >= totalSteps) {
      finish();
      return;
    }
    next();
  };

  return (
    <TourOverlayFrame onRequestClose={handleSkip}>
      <SpotlightBackdrop anchorId={step.anchor} screenW={screenW} screenH={screenH} />
      {isContextual && contextualLayout ? (
        <ContextualTourPopover
          step={step}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          layout={contextualLayout}
          onPrimary={handlePrimaryCta}
          onSkip={handleSkip}
          colors={colors}
          skipLabel={t.productTour.skip}
          progressLabel={progressLabel}
          textAlign={textAlign}
        />
      ) : (
        <BottomTourBar
          step={step}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          screenW={screenW}
          cardW={cardW}
          onPrimary={isContextual ? handlePrimaryCta : onPrimary}
          onSkip={handleSkip}
          colors={colors}
          skipLabel={t.productTour.skip}
          nextLabel={t.productTour.next}
          progressLabel={progressLabel}
          textAlign={textAlign}
        />
      )}
    </TourOverlayFrame>
  );
}

const styles = StyleSheet.create({
  overlayNative: {
    flex: 1,
  },
  overlayWeb: {
    zIndex: 100000,
    position: "fixed" as "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "box-none" as "auto",
  },
  abs: {
    position: "absolute",
  },
  absFixed: {
    position: "fixed" as "absolute",
  },
  fullDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
  },
  dim: {
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    zIndex: 1,
  },
  highlightRing: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#3057f2",
    backgroundColor: "transparent",
    zIndex: 2,
  },
  highlightRingOuter: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(48, 87, 242, 0.4)",
    backgroundColor: "rgba(48, 87, 242, 0.06)",
    zIndex: 2,
  },
  contextCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  contextDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  contextPrimaryBtn: {
    marginTop: 6,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: "center",
    cursor: "pointer" as "auto",
  },
  contextPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  contextFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 12,
  },
  skipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    cursor: "pointer" as "auto",
  },
  skipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: "auto",
  },
  bottomCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
    shadowColor: "#0f172a",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  bottomMessage: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "center",
  },
  bottomNextBtn: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    cursor: "pointer" as "auto",
  },
});
