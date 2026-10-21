import React, { useCallback, useEffect, useRef } from "react";
import {
  Platform,
  Pressable,
  View,
  type LayoutChangeEvent,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import {
  measureAnchorOnWeb,
  tourAnchorDataSet,
  useTourAnchorStore,
} from "@/domains/onboarding/tourAnchorStore";
import {
  useProductTourStore,
  type TourAnchor as TourAnchorId,
} from "@/domains/onboarding/productTourStore";

type Props = ViewProps & {
  id: TourAnchorId | string;
  onPress?: () => void;
  children: React.ReactNode;
  /** Wrap with Pressable so tour taps fire onPress + advance. */
  pressable?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
  /** When false, the wrapper does not emit its own testID (use the child target instead). */
  exposeWrapperTestId?: boolean;
};

const anchorShellStyle: ViewStyle = { alignSelf: "stretch", pointerEvents: "box-none" };

/** Registers a layout rect for the product tour spotlight. */
export function TourAnchor({
  id,
  onPress,
  children,
  pressable = false,
  testID,
  exposeWrapperTestId = false,
  onLayout: onLayoutProp,
  style,
  ...rest
}: Props) {
  const setRect = useTourAnchorStore((s) => s.setRect);
  const advanceOnAnchorTap = useProductTourStore((s) => s.advanceOnAnchorTap);
  const viewRef = useRef<View>(null);
  const resolvedTestId = exposeWrapperTestId ? (testID ?? String(id)) : undefined;
  const nativeId = `tour-anchor-${id}`;
  const webTargetProps = Platform.OS === "web" ? tourAnchorDataSet(String(id)) : {};

  const publishRect = useCallback(() => {
    if (Platform.OS === "web") {
      const rect = measureAnchorOnWeb(String(id), testID ?? String(id));
      if (rect) {
        setRect(String(id), rect);
        return;
      }
      const node = viewRef.current as unknown as Element | null;
      if (node?.getBoundingClientRect) {
        const r = node.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          setRect(String(id), { x: r.left, y: r.top, width: r.width, height: r.height });
        }
      }
      return;
    }
    viewRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) setRect(String(id), { x, y, width, height });
    });
  }, [id, setRect, testID]);

  useEffect(() => {
    publishRect();
    if (Platform.OS !== "web") return;
    const onReflow = () => publishRect();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    const timer = window.setInterval(onReflow, 200);
    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
      window.clearInterval(timer);
    };
  }, [publishRect]);

  const onLayout = (e: LayoutChangeEvent) => {
    onLayoutProp?.(e);
    requestAnimationFrame(() => publishRect());
  };

  const handlePress = () => {
    onPress?.();
    advanceOnAnchorTap(String(id) as TourAnchorId);
  };

  const mergedStyle = pressable
    ? (state: { pressed: boolean; hovered?: boolean }) => {
        const resolved = typeof style === "function" ? style(state) : style;
        return [anchorShellStyle, resolved];
      }
    : [anchorShellStyle, style];

  if (pressable) {
    return (
      <Pressable
        ref={viewRef as React.Ref<View>}
        testID={resolvedTestId}
        nativeID={nativeId}
        onLayout={onLayout}
        onPress={handlePress}
        style={mergedStyle}
        {...webTargetProps}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      ref={viewRef}
      testID={resolvedTestId}
      nativeID={nativeId}
      onLayout={onLayout}
      collapsable={false}
      style={mergedStyle}
      {...webTargetProps}
      {...rest}
    >
      {children}
    </View>
  );
}
