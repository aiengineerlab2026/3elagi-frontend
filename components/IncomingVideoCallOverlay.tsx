import { useRouter } from "expo-router";
import { Phone, PhoneOff } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Logo3elagi } from "@/components/Logo3elagi";
import { useAuthStore } from "@/domains/auth/store";
import { onIncomingVideoCall, onVideoCallStatus } from "@/domains/presence/socket";
import { acceptVideoCall, declineVideoCall } from "@/domains/video-call/api";
import {
  startIncomingCallRing,
  stopIncomingCallRing,
} from "@/domains/video-call/incomingCallRing";
import { consumeAndroidIncomingCallLaunchIntent } from "@/domains/video-call/androidIncomingCall";
import { useI18n } from "@/hooks/useI18n";
import { dismissIncomingCallNotifications } from "@/domains/push/expoPush";
import { useRinger } from "@/hooks/useRinger";
import {
  VIDEO_CALL_EVENTS,
  type IncomingVideoCallPushPayload,
} from "@/domains/video-call/events";
import { on } from "@/utils/eventBus";

type IncomingCall = {
  sessionId: string;
  callerId?: string;
  callerName?: string;
};

export function IncomingVideoCallOverlay() {
  const { isRTL } = useI18n();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const launchHandledRef = useRef(new Set<string>());

  const isDoctor = role?.toLowerCase() === "doctor";
  const useNativeAndroidRing = Platform.OS === "android";
  useRinger("ringtone", !!incoming && isDoctor && !busy && !useNativeAndroidRing);

  useEffect(() => {
    onIncomingVideoCall((payload) => {
      if (!isDoctor) return;
      const next = {
        sessionId: payload.session_id,
        callerId: payload.caller_id,
        callerName: payload.caller_name,
      };
      setIncoming((current) =>
        current?.sessionId === next.sessionId ? current : next,
      );
      startIncomingCallRing(next);
    });
    return () => onIncomingVideoCall(null);
  }, [isDoctor]);

  // Push fallback: with the socket down (backgrounded, flaky network) the
  // event above never lands, so the push raises the overlay instead.
  useEffect(() => {
    if (!isDoctor) return;
    return on<IncomingVideoCallPushPayload>(
      VIDEO_CALL_EVENTS.INCOMING_PUSH,
      (payload) => {
        setIncoming((current) =>
          current?.sessionId === payload.sessionId
            ? current
            : {
                sessionId: payload.sessionId,
                callerId: payload.callerId ?? "",
                callerName: payload.callerName,
              },
        );
        startIncomingCallRing({
          sessionId: payload.sessionId,
          callerId: payload.callerId,
          callerName: payload.callerName,
        });
      },
    );
  }, [isDoctor]);

  // Notification accept / decline / full-screen intent when app was killed or backgrounded.
  useEffect(() => {
    if (!isDoctor || Platform.OS !== "android" || !accessToken) return;

    const handleLaunchIntent = async () => {
      const launch = await consumeAndroidIncomingCallLaunchIntent();
      if (!launch?.sessionId) return;

      const launchKey = `${launch.sessionId}:${launch.acceptCall ? "accept" : launch.declineCall ? "decline" : "open"}`;
      if (launchHandledRef.current.has(launchKey)) return;
      launchHandledRef.current.add(launchKey);

      stopIncomingCallRing(launch.sessionId);
      void dismissIncomingCallNotifications(launch.sessionId);

      if (launch.declineCall) {
        try {
          await declineVideoCall(accessToken, launch.sessionId);
        } catch {
          // ignore
        }
        return;
      }

      if (launch.acceptCall) {
        setBusy("accept");
        try {
          await acceptVideoCall(accessToken, launch.sessionId);
          router.push({
            pathname: "/video-call",
            params: { sessionId: launch.sessionId },
          });
        } catch {
          // fall through to overlay if accept fails
          setIncoming({
            sessionId: launch.sessionId,
            callerId: launch.callerId,
            callerName: launch.callerName,
          });
        } finally {
          setBusy(null);
        }
        return;
      }

      setIncoming({
        sessionId: launch.sessionId,
        callerId: launch.callerId,
        callerName: launch.callerName,
      });
    };

    void handleLaunchIntent();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void handleLaunchIntent();
    });
    return () => sub.remove();
  }, [isDoctor, accessToken, router]);

  // Caller hung up before we answered — stop ringing.
  useEffect(() => {
    onVideoCallStatus((payload) => {
      setIncoming((current) => {
        if (!current || current.sessionId !== payload.session_id) return current;
        // The push is still sitting in the tray ringing for a call that is over.
        void dismissIncomingCallNotifications(payload.session_id);
        stopIncomingCallRing(payload.session_id);
        return null;
      });
    });
    return () => onVideoCallStatus(null);
  }, []);

  const dismiss = (sessionId?: string) => {
    setBusy(null);
    setIncoming(null);
    stopIncomingCallRing(sessionId);
    void dismissIncomingCallNotifications(sessionId);
  };

  const handleAccept = async () => {
    if (!accessToken || !incoming || busy) return;
    setBusy("accept");
    try {
      await acceptVideoCall(accessToken, incoming.sessionId);
      dismiss(incoming.sessionId);
      router.push({
        pathname: "/video-call",
        params: { sessionId: incoming.sessionId },
      });
    } catch {
      dismiss(incoming.sessionId);
    }
  };

  const handleReject = async () => {
    if (!accessToken || !incoming || busy) return;
    setBusy("reject");
    try {
      await declineVideoCall(accessToken, incoming.sessionId);
    } catch {
      // ignore
    } finally {
      dismiss(incoming.sessionId);
    }
  };

  if (!incoming || !isDoctor) return null;

  const callerName = incoming.callerName?.trim() || (isRTL ? "مريض" : "Patient");

  return (
    <Modal visible transparent animationType="fade">
      <View style={[styles.backdrop, { backgroundColor: "rgba(8, 15, 30, 0.9)" }]}>
        <View style={styles.content}>
          <Logo3elagi height={64} centered />
          <Text style={[styles.title, { color: "#fff" }]}>
            {isRTL ? "مكالمة فيديو واردة" : "Incoming video call"}
          </Text>
          <Text style={[styles.name, { color: "#fff" }]}>{callerName}</Text>
          <Text style={[styles.subtitle, { color: "rgba(255,255,255,0.78)" }]}>
            {isRTL ? "يريد بدء مكالمة الآن" : "wants to start a call now"}
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={() => void handleReject()}
              disabled={!!busy}
              style={[styles.circleBtn, { backgroundColor: "#ef4444", opacity: busy ? 0.7 : 1 }]}
            >
              {busy === "reject" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <PhoneOff size={28} color="#fff" />
              )}
            </Pressable>
            <Pressable
              onPress={() => void handleAccept()}
              disabled={!!busy}
              style={[styles.circleBtn, { backgroundColor: "#22c55e", opacity: busy ? 0.7 : 1 }]}
            >
              {busy === "accept" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Phone size={28} color="#fff" />
              )}
            </Pressable>
          </View>

          <View style={styles.labels}>
            <Text style={[styles.actionLabel, { color: "rgba(255,255,255,0.84)" }]}>
              {isRTL ? "رفض" : "Reject"}
            </Text>
            <Text style={[styles.actionLabel, { color: "rgba(255,255,255,0.84)" }]}>
              {isRTL ? "قبول" : "Accept"}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 22,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  name: {
    marginTop: 18,
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    textAlign: "center",
  },
  actions: {
    marginTop: 44,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  circleBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  labels: {
    marginTop: 14,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "700",
    minWidth: 84,
    textAlign: "center",
  },
});
