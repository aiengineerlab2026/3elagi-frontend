import {
  Cairo_300Light,
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/cairo";
import { useEffect } from "react";
import { Platform, StyleSheet, Text, TextInput, type TextStyle } from "react-native";
import { useI18nStore } from "@/domains/i18n/store";

/**
 * Cairo on native. Web gets it from the stylesheet in `+html.tsx`, so this is
 * native-only: RN can't pick a weight out of a custom family by itself
 * (Android has no family XML here), so every weight is loaded as its own face
 * and Text/TextInput are patched to map fontWeight → face while Arabic is on.
 */
const FACE_BY_WEIGHT: Record<string, string> = {
  "300": "Cairo_300Light",
  normal: "Cairo_400Regular",
  "400": "Cairo_400Regular",
  "500": "Cairo_500Medium",
  "600": "Cairo_600SemiBold",
  bold: "Cairo_700Bold",
  "700": "Cairo_700Bold",
  "800": "Cairo_800ExtraBold",
  "900": "Cairo_800ExtraBold",
};

/** Flipped by the component below; the patch reads it on every render. */
let arabicActive = false;
let patched = false;

function cairoStyle(style: unknown): TextStyle[] {
  const flat = (StyleSheet.flatten(style as TextStyle) ?? {}) as TextStyle;
  // An explicit family (icon fonts, the logo) wins — never override it.
  if (flat.fontFamily) return [style as TextStyle];
  const weight = flat.fontWeight ? String(flat.fontWeight) : "400";
  return [style as TextStyle, { fontFamily: FACE_BY_WEIGHT[weight] ?? FACE_BY_WEIGHT["400"] }];
}

function patchTextComponents() {
  if (patched || Platform.OS === "web") return;
  patched = true;

  for (const Component of [Text, TextInput] as unknown as {
    render: (...args: unknown[]) => { props?: { style?: unknown } };
  }[]) {
    const original = Component.render;
    Component.render = function patchedRender(...args: unknown[]) {
      const element = original.apply(this, args);
      if (!arabicActive || !element?.props) return element;
      return { ...element, props: { ...element.props, style: cairoStyle(element.props.style) } };
    };
  }
}

export function ArabicFontBootstrap() {
  const locale = useI18nStore((s) => s.locale);
  const [loaded] = useFonts({
    Cairo_300Light,
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });

  useEffect(() => {
    patchTextComponents();
    arabicActive = loaded && locale === "ar";
  }, [loaded, locale]);

  return null;
}
