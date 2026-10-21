import { useRouter } from "expo-router";
import { Beaker, ScanLine } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import {
  CHAT_EVENTS,
  type DocumentRequestReceivedPayload,
} from "@/domains/chat/events";
import { useAuthStore } from "@/domains/auth/store";
import { on } from "@/utils/eventBus";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { flexRow } from "@/utils/rtl";

/**
 * Patient-facing dialog for a new lab / x-ray request. A chat bubble alone was
 * easy to scroll past, and the request is an action the patient must complete.
 */
export function DocumentRequestAlert() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const isPatient = role?.toLowerCase() === "patient";
  const [request, setRequest] = useState<DocumentRequestReceivedPayload | null>(
    null,
  );

  useEffect(() => {
    if (!isPatient) return;
    return on<DocumentRequestReceivedPayload>(
      CHAT_EVENTS.DOCUMENT_REQUEST_RECEIVED,
      (payload) => {
        if (payload?.requestId) setRequest(payload);
      },
    );
  }, [isPatient]);

  if (!request) return null;

  const isXray = request.requestType === "xray";
  const Icon = isXray ? ScanLine : Beaker;
  const dismiss = () => setRequest(null);
  const openRequest = () => {
    const id = request.requestId;
    dismiss();
    router.push({ pathname: "/medical/request/[id]", params: { id } } as never);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        <View
          style={[
            styles.dialog,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
            <Icon size={26} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            {isXray ? t.records.newXrayRequest : t.records.newLabRequest}
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            {t.records.newRequestBody}
          </Text>
          {request.title?.trim() ? (
            <Text style={[styles.requestTitle, { color: colors.foreground }]}>
              {request.title.trim()}
            </Text>
          ) : null}

          <View style={[styles.actions, { flexDirection: flexRow(isRTL) }]}>
            <Pressable onPress={dismiss} style={styles.laterBtn}>
              <Text style={{ color: colors.mutedForeground, fontWeight: "700" }}>
                {t.records.requestLater}
              </Text>
            </Pressable>
            <Pressable
              onPress={openRequest}
              style={[styles.openBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>
                {t.records.requestOpen}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
  },
  dialog: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  title: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  body: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  requestTitle: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  actions: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  laterBtn: { paddingHorizontal: 18, paddingVertical: 12 },
  openBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
});
