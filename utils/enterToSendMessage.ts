import type { NativeSyntheticEvent, TextInputKeyPressEventData } from "react-native";
import { Dimensions, Platform } from "react-native";
import { WEB_BREAKPOINTS } from "@/constants/webLayout";
import { readDemoWebLayoutOverride } from "@/domains/auth/demoSession";

/**
 * Enter sends only on desktop web, where there is a real keyboard and Shift+Enter
 * is the natural way to add a newline.
 *
 * On phones — native and mobile web — Enter is the return key: people use it to
 * break lines, and sending on it fires off half-written messages.
 */
export function shouldSendOnEnter(): boolean {
  if (Platform.OS !== "web") return false;
  const demoLayout = readDemoWebLayoutOverride();
  if (demoLayout === "mobile") return false;
  if (demoLayout === "desktop") return true;
  return Dimensions.get("window").width >= WEB_BREAKPOINTS.desktop;
}

/** Enter sends; Shift+Enter inserts a newline (desktop web only). */
export function handleEnterToSendMessage(
  e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  send: () => void,
): void {
  if (e.nativeEvent.key !== "Enter") return;
  if (!shouldSendOnEnter()) return;

  const native = e.nativeEvent as TextInputKeyPressEventData & {
    shiftKey?: boolean;
  };
  if (native.shiftKey) return;

  e.preventDefault?.();
  send();
}
