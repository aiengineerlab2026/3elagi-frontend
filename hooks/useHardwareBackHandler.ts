import { useCallback, useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";
import { useWebLayout } from "@/hooks/useWebLayout";

/** Android hardware back — returns true when the event is consumed. */
export function useHardwareBackHandler(
  handler: () => boolean,
  enabled = true,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;

    const onBack = () => handlerRef.current();

    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [enabled]);
}

/** Mobile web browser back — pushes a guard entry when `guardKey` changes. */
export function useWebMobileBackHandler(
  handler: () => void,
  enabled = true,
  guardKey?: string,
): void {
  const { isMobile } = useWebLayout();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (
      Platform.OS !== "web" ||
      !enabled ||
      !isMobile ||
      !guardKey ||
      typeof window === "undefined"
    ) {
      return;
    }

    window.history.pushState({ appBackGuard: true }, "");
    const onPopState = () => {
      handlerRef.current();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabled, isMobile, guardKey]);
}
