import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useAuthStore } from "@/domains/auth/store";
import {
  announcePresenceLogin,
  connectPresenceSocket,
  disconnectPresenceSocket,
} from "@/domains/presence/socket";
import { buildLoggedInUser } from "@/domains/presence/user";
import { NATIVE_WEBVIEW_BRIDGE } from "@/constants/nativeWebViewBridge";
import { isNativeWebViewShell } from "@/utils/nativeWebViewBridge";

/**
 * How long the app can be backgrounded / the tab hidden before we fully close
 * the WebSocket. A short grace avoids reconnect churn on quick tab switches,
 * while still killing "zombie" connections that would otherwise keep a Cloud
 * Run instance active (and billing) for hours.
 */
const BACKGROUND_DISCONNECT_MS = 45_000;

export function PresenceSocket() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const profile = useAuthStore((s) => s.profile);
  const role = useAuthStore((s) => s.role);
  const specialty = useAuthStore((s) => s.specialty);
  const specialityId = useAuthStore((s) => s.specialityId);
  const doctorId = useAuthStore((s) => s.doctorId);
  const accessToken = useAuthStore((s) => s.accessToken);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    if (!profile || !accessToken) {
      disconnectPresenceSocket();
      return;
    }

    const user = buildLoggedInUser(profile, role, specialty, specialityId, doctorId);
    connectPresenceSocket(user, accessToken);

    return () => {
      disconnectPresenceSocket(profile.id);
    };
  }, [hydrated, profile?.id, accessToken]);

  useEffect(() => {
    if (!hydrated || !profile || !accessToken) return;

    const user = buildLoggedInUser(profile, role, specialty, specialityId, doctorId);
    announcePresenceLogin(user, accessToken);
  }, [
    hydrated,
    profile?.id,
    profile?.name,
    profile?.email,
    profile?.avatarUrl,
    role,
    specialty,
    specialityId,
    doctorId,
    accessToken,
  ]);

  // Disconnect the socket entirely when the app is hidden/backgrounded, and
  // reconnect when it returns. Keeps idle tabs from holding a Cloud Run instance.
  useEffect(() => {
    if (!hydrated || !profile || !accessToken) return;

    const user = buildLoggedInUser(profile, role, specialty, specialityId, doctorId);
    const userId = profile.id;

    const clearIdleTimer = () => {
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }
    };

    const goInactive = () => {
      if (idleTimer.current) return;
      idleTimer.current = setTimeout(() => {
        idleTimer.current = null;
        disconnectPresenceSocket(userId);
      }, BACKGROUND_DISCONNECT_MS);
    };

    const goActive = () => {
      clearIdleTimer();
      connectPresenceSocket(user, accessToken);
    };

    const cleanups: Array<() => void> = [];

    // Native app lifecycle.
    if (Platform.OS !== "web") {
      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") goActive();
        else goInactive();
      });
      cleanups.push(() => sub.remove());
    }

    // Browser tab visibility / focus.
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const onVisibility = () => (document.hidden ? goInactive() : goActive());
      const onFocus = () => goActive();
      const onBlur = () => {
        // Only treat blur as inactive when the tab is actually hidden.
        if (document.hidden) goInactive();
      };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("focus", onFocus);
      window.addEventListener("blur", onBlur);
      cleanups.push(() => {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("blur", onBlur);
      });
    }

    // Native shell wrapping the web app.
    if (isNativeWebViewShell()) {
      window.addEventListener(NATIVE_WEBVIEW_BRIDGE.APP_BACKGROUND, goInactive);
      window.addEventListener(NATIVE_WEBVIEW_BRIDGE.APP_FOREGROUND, goActive);
      cleanups.push(() => {
        window.removeEventListener(NATIVE_WEBVIEW_BRIDGE.APP_BACKGROUND, goInactive);
        window.removeEventListener(NATIVE_WEBVIEW_BRIDGE.APP_FOREGROUND, goActive);
      });
    }

    return () => {
      clearIdleTimer();
      cleanups.forEach((fn) => fn());
    };
  }, [
    hydrated,
    profile?.id,
    profile?.name,
    profile?.email,
    profile?.avatarUrl,
    role,
    specialty,
    specialityId,
    doctorId,
    accessToken,
  ]);

  return null;
}
