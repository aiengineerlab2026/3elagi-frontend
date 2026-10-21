import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PendingChangeMeta } from "@/domains/chat/types";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

export type ChangeReply = "accept" | "decline";

type Props = {
  meta: PendingChangeMeta;
  /** "reschedule" shows the proposed slot; "cancel" just asks. */
  kind: "reschedule" | "cancel";
  /** Signed-in user — whoever asked cannot answer. */
  selfUserId?: string | null;
  busy?: boolean;
  onReply?: (reply: ChangeReply) => void;
};

/**
 * The other side proposed something — a new slot or cancelling — and this is
 * where it gets answered. Nothing changes until they do.
 */
export function PendingChangePanel({
  meta,
  kind,
  selfUserId,
  busy,
  onReply,
}: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const dir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const mine = !!selfUserId && meta.pending_by === selfUserId;

  const slot =
    kind === "reschedule" && meta.proposed_date
      ? `${meta.proposed_date}${meta.proposed_time ? ` · ${meta.proposed_time.slice(0, 5)}` : ""}`
      : null;

  const headline = mine
    ? isRTL
      ? "بانتظار رد الطرف الآخر"
      : "Waiting for the other person to answer"
    : kind === "reschedule"
      ? isRTL
        ? "هل توافق على الموعد الجديد؟"
        : "Accept the new time?"
      : isRTL
        ? "هل توافق على الإلغاء؟"
        : "Approve cancelling this?";

  return (
    <View style={[styles.wrap, { borderColor: colors.border }]}>
      <Text style={[styles.headline, { color: colors.foreground, textAlign }]}>
        {headline}
      </Text>
      {slot ? (
        <Text style={[styles.slot, { color: colors.primary, textAlign }]}>{slot}</Text>
      ) : null}

      {!mine ? (
        <View style={[styles.actions, { flexDirection: dir }]}>
          <Pressable
            disabled={busy}
            onPress={() => onReply?.("accept")}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: "#10b981", opacity: busy ? 0.6 : pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.btnText, { color: "#fff" }]}>
              {isRTL ? "موافق" : "Accept"}
            </Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => onReply?.("decline")}
            style={({ pressed }) => [
              styles.btn,
              styles.btnOutline,
              { borderColor: "#dc2626", opacity: busy ? 0.6 : pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.btnText, { color: "#dc2626" }]}>
              {isRTL ? "رفض" : "Decline"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  headline: { fontSize: 13, fontWeight: "700" },
  slot: { fontSize: 15, fontWeight: "800" },
  actions: { gap: 8, flexWrap: "wrap", marginTop: 2 },
  btn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnOutline: { borderWidth: 1, backgroundColor: "transparent" },
  btnText: { fontSize: 13, fontWeight: "700" },
});
