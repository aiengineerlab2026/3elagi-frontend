import { useEffect } from "react";
import { AUTH_EVENTS } from "@/domains/auth/events";
import { useAuthStore } from "@/domains/auth/store";
import { NATIVE_WEBVIEW_BRIDGE } from "@/constants/nativeWebViewBridge";
import {
  isNativeWebViewShell,
  postWebViewAuthLogout,
  postWebViewAuthSession,
} from "@/utils/nativeWebViewBridge";
import { ensureNativeShellMediaListener } from "@/utils/nativeWebViewMedia";
import { on } from "@/utils/eventBus";

/** Syncs web auth session to the native WebView shell for Expo push registration. */
export function NativeWebViewAuthBridge() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const profile = useAuthStore((s) => s.profile);
  const role = useAuthStore((s) => s.role);
  const doctorId = useAuthStore((s) => s.doctorId);
  const specialty = useAuthStore((s) => s.specialty);
  const specialityId = useAuthStore((s) => s.specialityId);
  const doctorApprovalStatus = useAuthStore((s) => s.doctorApprovalStatus);

  useEffect(() => {
    if (!isNativeWebViewShell()) return;

    ensureNativeShellMediaListener();

    const syncSession = () => {
      if (!hydrated || !accessToken || !profile || !role) {
        postWebViewAuthLogout();
        return;
      }

      postWebViewAuthSession({
        accessToken,
        profile,
        role,
        doctorId,
        specialty,
        specialityId,
        doctorApprovalStatus,
      });
    };

    syncSession();

    const onRequestAuth = () => syncSession();
    window.addEventListener(NATIVE_WEBVIEW_BRIDGE.REQUEST_AUTH, onRequestAuth);

    const unsubscribeLogout = on(AUTH_EVENTS.LOGOUT, () => {
      postWebViewAuthLogout();
    });

    return () => {
      window.removeEventListener(NATIVE_WEBVIEW_BRIDGE.REQUEST_AUTH, onRequestAuth);
      unsubscribeLogout();
    };
  }, [
    hydrated,
    accessToken,
    profile,
    role,
    doctorId,
    specialty,
    specialityId,
    doctorApprovalStatus,
  ]);

  return null;
}
