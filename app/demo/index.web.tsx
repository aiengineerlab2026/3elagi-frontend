import { router } from "expo-router";
import { RefreshCw, RotateCcw } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo3elagi } from "@/components/Logo3elagi";
import { LanguageDropdown } from "@/components/language/LanguageDropdown";
import { LOGO_HEIGHT } from "@/constants/brand";
import {
  DEMO_ENABLED,
  DEMO_SLOT_LABELS,
  type DemoSlot,
} from "@/constants/demo";
import {
  type DemoDevice,
  demoFrameName,
} from "@/domains/auth/demoSession";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";

const H_PAD = 16;
const PANEL_GAP = 12;
const HEADER_BLOCK = 96;
/** Default split: mobile panel gets 20% width, laptop gets 80%. */
const DEFAULT_MOBILE_SHARE = 0.2;
const DEFAULT_DEVICES: Record<DemoSlot, DemoDevice> = {
  mobile: "phone",
  laptop: "laptop",
};
/** Logical device viewports; each iframe renders at this width and is scaled to fit. */
const PHONE_VIEWPORT_W = 390;
const LAPTOP_VIEWPORT_W = 1280;
const IFRAME_FILL: React.CSSProperties = {
  border: 0,
  width: "100%",
  height: "100%",
  maxWidth: "100%",
  display: "block",
};

type PanelFrameProps = {
  slot: DemoSlot;
  src: string;
  label: string;
  width: number;
  height: number;
  isRTL: boolean;
  focused: boolean;
  colors: ReturnType<typeof useColors>;
  onFocus: () => void;
  onReload: () => void;
  onIframeRef: (node: HTMLIFrameElement | null) => void;
};

function PanelContent({
  slot,
  device,
  src,
  label,
  onIframeRef,
  style,
}: {
  slot: DemoSlot;
  device: DemoDevice;
  src: string;
  label: string;
  onIframeRef: (node: HTMLIFrameElement | null) => void;
  style?: React.CSSProperties;
}) {
  return (
    // eslint-disable-next-line react/no-unknown-property
    <iframe
      ref={(node) => onIframeRef(node as HTMLIFrameElement | null)}
      title={label}
      name={demoFrameName(slot, device)}
      src={src}
      style={style ?? IFRAME_FILL}
    />
  );
}

/** Measures the device screen box and scales a fixed logical viewport into it. */
function useScaledViewport(viewportWidth: number) {
  const [screen, setScreen] = useState({ w: 0, h: 0 });
  const scale = screen.w > 0 ? Math.min(1, screen.w / viewportWidth) : 1;

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout;
    setScreen((prev) =>
      Math.abs(prev.w - w) < 1 && Math.abs(prev.h - h) < 1 ? prev : { w, h },
    );
  }, []);

  const iframeStyle: React.CSSProperties = {
    border: 0,
    display: "block",
    // Flex item in a column parent shrinks back to the container height, undoing the scale.
    flexShrink: 0,
    width: viewportWidth,
    height: screen.h / scale,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
  };

  return { ready: screen.w > 0, onLayout, iframeStyle };
}

function PanelToolbar({
  label,
  isRTL,
  focused,
  colors,
  onFocus,
  onReload,
}: {
  label: string;
  isRTL: boolean;
  focused: boolean;
  colors: ReturnType<typeof useColors>;
  onFocus: () => void;
  onReload: () => void;
}) {
  const dir = flexRow(isRTL);

  return (
    <View style={styles.panelToolbar}>
      <View style={[styles.panelTitleRow, { flexDirection: dir }]}>
        <View style={[styles.panelTitleLead, { flexDirection: dir }]}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: focused ? "#22c55e" : colors.mutedForeground },
            ]}
          />
          <Pressable onPress={onFocus}>
            <Text
              style={[
                styles.panelLabel,
                {
                  color: focused ? colors.primary : colors.foreground,
                  textAlign: alignText(isRTL),
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityLabel="Reload panel"
          onPress={onReload}
          style={({ pressed, hovered }) => [
            styles.iconBtn,
            {
              borderColor: colors.border,
              backgroundColor: pressed || hovered ? colors.muted : colors.card,
            },
          ]}
        >
          <RotateCcw size={14} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

function PhoneDeviceFrame({
  slot,
  device,
  src,
  label,
  width,
  height,
  isRTL,
  focused,
  colors,
  onFocus,
  onReload,
  onIframeRef,
}: PanelFrameProps & { device: DemoDevice }) {
  const bezel = "#1a1a1e";
  const screenRadius = Math.min(22, width * 0.06);
  // ponytail: CSS scale of a real phone viewport, not per-screen responsive fixes.
  const viewport = useScaledViewport(PHONE_VIEWPORT_W);

  return (
    <View
      style={[
        styles.panelColumn,
        { width, height },
        focused && { transform: [{ scale: 1.01 }] },
      ]}
    >
      <PanelToolbar
        label={label}
        isRTL={isRTL}
        focused={focused}
        colors={colors}
        onFocus={onFocus}
        onReload={onReload}
      />
      <Pressable onPress={onFocus} style={{ flex: 1, minHeight: 0 }}>
        <View
          style={[
            styles.phoneShell,
            {
              backgroundColor: bezel,
              borderColor: focused ? colors.primary : "#2a2a30",
              shadowOpacity: focused ? 0.38 : 0.28,
            },
          ]}
        >
          <View style={styles.phoneSideButtonLeft} />
          <View style={styles.phoneSideButtonRight} />
          <View style={[styles.phoneScreenWrap, { borderRadius: screenRadius }]}>
            <View style={styles.phoneNotchRow}>
              <View style={styles.phoneNotch} />
            </View>
            <View
              style={[styles.phoneScreen, { backgroundColor: colors.background }]}
              onLayout={viewport.onLayout}
            >
              {viewport.ready ? (
                <PanelContent
                  slot={slot}
                  device={device}
                  src={src}
                  label={label}
                  onIframeRef={onIframeRef}
                  style={viewport.iframeStyle}
                />
              ) : null}
            </View>
            <View style={styles.phoneHomeRow}>
              <View style={styles.phoneHomeIndicator} />
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function LaptopDeviceFrame({
  slot,
  device,
  src,
  label,
  width,
  height,
  isRTL,
  focused,
  colors,
  onFocus,
  onReload,
  onIframeRef,
}: PanelFrameProps & { device: DemoDevice }) {
  const lidHeight = height - 28;
  const bezel = "#2b2b30";
  const baseWidth = width + 24;
  // ponytail: same fixed-viewport scale as the phone, so desktop chrome never flips to mobile.
  const viewport = useScaledViewport(LAPTOP_VIEWPORT_W);

  return (
    <View
      style={[
        styles.panelColumn,
        { width, height },
        focused && { transform: [{ scale: 1.005 }] },
      ]}
    >
      <PanelToolbar
        label={label}
        isRTL={isRTL}
        focused={focused}
        colors={colors}
        onFocus={onFocus}
        onReload={onReload}
      />
      <Pressable onPress={onFocus} style={{ flex: 1, minHeight: 0 }}>
        <View style={styles.laptopStack}>
          <View
            style={[
              styles.laptopLid,
              {
                width,
                height: lidHeight,
                backgroundColor: bezel,
                borderColor: focused ? colors.primary : "#3f3f46",
                shadowOpacity: focused ? 0.32 : 0.22,
              },
            ]}
          >
            <View style={styles.laptopCameraRow}>
              <View style={styles.laptopCamera} />
            </View>
            <View
              style={[styles.laptopScreen, { backgroundColor: colors.background }]}
              onLayout={viewport.onLayout}
            >
              {viewport.ready ? (
                <PanelContent
                  slot={slot}
                  device={device}
                  src={src}
                  label={label}
                  onIframeRef={onIframeRef}
                  style={viewport.iframeStyle}
                />
              ) : null}
            </View>
          </View>
          <View
            style={[
              styles.laptopBase,
              {
                width: baseWidth,
                backgroundColor: "#3f3f46",
                borderColor: focused ? colors.primary : "#52525b",
              },
            ]}
          >
            <View style={styles.laptopTrackpad} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function PanelFrame(props: PanelFrameProps) {
  const device = DEFAULT_DEVICES[props.slot];
  if (device === "phone") {
    return <PhoneDeviceFrame {...props} device={device} />;
  }
  return <LaptopDeviceFrame {...props} device={device} />;
}

function embedUrl(origin: string, slot: DemoSlot, reset = false) {
  const params = new URLSearchParams();
  if (reset) params.set("reset", "1");
  params.set("t", String(Date.now()));
  return `${origin}/demo/embed/${slot}?${params.toString()}`;
}

export default function DemoScreen() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const { width: vw, height: vh } = useWindowDimensions();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const iframeRefs = useRef<Partial<Record<DemoSlot, HTMLIFrameElement>>>({});

  const [focusedPanel, setFocusedPanel] = useState<DemoSlot>("mobile");
  const [panelSrc, setPanelSrc] = useState<Record<DemoSlot, string>>({
    mobile: "",
    laptop: "",
  });

  const layout = useMemo(() => {
    const usableW = Math.max(vw - H_PAD * 2 - PANEL_GAP, 320);
    const usableH = Math.max(
      vh - insets.top - insets.bottom - HEADER_BLOCK - 12,
      400,
    );
    const mobileWidth = usableW * DEFAULT_MOBILE_SHARE;
    const laptopWidth = usableW * (1 - DEFAULT_MOBILE_SHARE);
    return {
      usableW,
      mobileWidth,
      laptopWidth,
      panelHeight: usableH,
    };
  }, [vw, vh, insets.top, insets.bottom]);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const bootPanels = useCallback(
    (reset = false) => {
      if (!origin) return;
      setPanelSrc({
        mobile: embedUrl(origin, "mobile", reset),
        laptop: embedUrl(origin, "laptop", reset),
      });
    },
    [origin],
  );

  const reloadPanel = useCallback(
    (slot: DemoSlot) => {
      if (!origin) return;
      setPanelSrc((prev) => ({ ...prev, [slot]: "" }));
      iframeRefs.current[slot] = undefined;
      requestAnimationFrame(() => {
        setPanelSrc((prev) => ({
          ...prev,
          [slot]: embedUrl(origin, slot, true),
        }));
      });
    },
    [origin],
  );

  useEffect(() => {
    bootPanels(false);
  }, [bootPanels]);

  if (!DEMO_ENABLED) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background, paddingTop: insets.top + 24 }]}>
        <Text style={{ color: colors.foreground, textAlign: "center", padding: 24 }}>
          {isRTL ? "العرض التجريبي غير متاح." : "Demo is not enabled."}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.page,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
          height: vh,
        },
      ]}
    >
      <View style={[styles.header, { flexDirection: dir, paddingHorizontal: H_PAD }]}>
        <Pressable
          onPress={() => bootPanels(true)}
          style={({ pressed, hovered }) => [
            styles.logoBtn,
            { opacity: pressed || hovered ? 0.85 : 1 },
          ]}
        >
          <Logo3elagi height={LOGO_HEIGHT.header} markOnly />
        </Pressable>

        <View style={{ flex: 1, gap: 2, minWidth: 0, paddingHorizontal: 8 }}>
          <Text style={[styles.title, { color: colors.foreground, textAlign }]} numberOfLines={1}>
            {isRTL ? "عرض تفاعلي — مريض وطبيب" : "Live demo — patient & doctor"}
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}
            numberOfLines={2}
          >
            {isRTL
              ? "سجّل الدخول أو أنشئ حسابًا في كل جهاز — كل جلسة مستقلة."
              : "Sign in or sign up on each device — each session stays independent."}
          </Text>
        </View>

        <View style={[styles.headerActions, { flexDirection: dir }]}>
          <LanguageDropdown compact />
          <Pressable
            onPress={() => bootPanels(true)}
            style={({ pressed, hovered }) => [
              styles.reloadBtn,
              {
                flexDirection: dir,
                borderColor: colors.border,
                backgroundColor: pressed || hovered ? colors.muted : colors.card,
              },
            ]}
          >
            <RefreshCw size={14} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
              {isRTL ? "إعادة تعيين" : "Reset all"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace("/(tabs)")}
            style={({ pressed, hovered }) => [
              styles.exitBtn,
              {
                borderColor: colors.border,
                backgroundColor: pressed || hovered ? colors.muted : "transparent",
              },
            ]}
          >
            <Text style={{ color: colors.mutedForeground, fontWeight: "600", fontSize: 13 }}>
              {isRTL ? "خروج" : "Exit"}
            </Text>
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.panelsRow,
          {
            flexDirection: dir,
            paddingHorizontal: H_PAD,
            height: layout.panelHeight,
            gap: PANEL_GAP,
          },
        ]}
      >
        <PanelFrame
          key="mobile"
          slot="mobile"
          src={panelSrc.mobile}
          label={isRTL ? DEMO_SLOT_LABELS.mobile.ar : DEMO_SLOT_LABELS.mobile.en}
          width={layout.mobileWidth}
          height={layout.panelHeight}
          isRTL={isRTL}
          focused={focusedPanel === "mobile"}
          colors={colors}
          onFocus={() => setFocusedPanel("mobile")}
          onReload={() => reloadPanel("mobile")}
          onIframeRef={(node) => {
            if (node) iframeRefs.current.mobile = node;
          }}
        />
        <PanelFrame
          key="laptop"
          slot="laptop"
          src={panelSrc.laptop}
          label={isRTL ? DEMO_SLOT_LABELS.laptop.ar : DEMO_SLOT_LABELS.laptop.en}
          width={layout.laptopWidth}
          height={layout.panelHeight}
          isRTL={isRTL}
          focused={focusedPanel === "laptop"}
          colors={colors}
          onFocus={() => setFocusedPanel("laptop")}
          onReload={() => reloadPanel("laptop")}
          onIframeRef={(node) => {
            if (node) iframeRefs.current.laptop = node;
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: HEADER_BLOCK - 12,
    marginBottom: 8,
  },
  logoBtn: {
    padding: 4,
    borderRadius: 12,
  },
  headerActions: {
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 13, lineHeight: 18 },
  reloadBtn: {
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exitBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  panelsRow: {
    alignItems: "stretch",
    justifyContent: "center",
    width: "100%",
    position: "relative",
  },
  panelColumn: {
    gap: 8,
    minHeight: 0,
  },
  panelToolbar: {
    gap: 6,
  },
  panelTitleRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  panelTitleLead: {
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  panelLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  iconBtn: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    cursor: "pointer" as "auto",
  },

  phoneShell: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 36,
    padding: 10,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    cursor: "pointer" as "auto",
  },
  phoneSideButtonLeft: {
    position: "absolute",
    left: -3,
    top: "22%",
    width: 3,
    height: 48,
    borderRadius: 2,
    backgroundColor: "#3f3f46",
  },
  phoneSideButtonRight: {
    position: "absolute",
    right: -3,
    top: "18%",
    width: 3,
    height: 32,
    borderRadius: 2,
    backgroundColor: "#3f3f46",
  },
  phoneScreenWrap: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  phoneNotchRow: {
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: "#000",
  },
  phoneNotch: {
    width: 84,
    height: 22,
    borderRadius: 14,
    backgroundColor: "#0a0a0a",
  },
  phoneScreen: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
  },
  phoneHomeRow: {
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: "#000",
  },
  phoneHomeIndicator: {
    width: 96,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.35)",
  },

  laptopStack: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: 0,
  },
  laptopLid: {
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    padding: 10,
    paddingBottom: 8,
    flex: 1,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    cursor: "pointer" as "auto",
  },
  laptopCameraRow: {
    alignItems: "center",
    marginBottom: 6,
  },
  laptopCamera: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#52525b",
  },
  laptopScreen: {
    flex: 1,
    minHeight: 0,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#18181b",
  },
  laptopBase: {
    height: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 2,
    borderTopWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  laptopTrackpad: {
    width: "18%",
    height: 4,
    borderRadius: 999,
    backgroundColor: "#52525b",
    marginTop: 2,
  },

});
