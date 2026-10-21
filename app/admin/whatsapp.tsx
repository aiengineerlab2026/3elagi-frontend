import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { TextInput } from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminContentMaxWidth, adminPagePadding } from "@/constants/adminLayout";
import {
  buildDefaultWhatsAppInviteMessage,
  buildWhatsAppUrl,
  parseWhatsAppFormatting,
  parseWhatsAppRecipients,
  wrapTextSelection,
} from "@/domains/admin/whatsappMessage";
import { useColors } from "@/hooks/useColors";
import { showErrorToast } from "@/utils/toast";
import { AlertCircle, ExternalLink, MessageCircle, RotateCcw } from "lucide-react-native";

const WHATSAPP_LOGIN_HINT =
  "Before sending, make sure you are logged into WhatsApp Web (web.whatsapp.com) in this browser, or have the WhatsApp app installed on your phone. If you are not logged in, WhatsApp will ask you to scan the QR code or sign in first.";

function FormatButton({
  label,
  onPress,
  colors,
}: {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.formatBtn,
        {
          borderColor: colors.border,
          backgroundColor: pressed ? colors.muted : colors.background,
        },
      ]}
    >
      <Text style={[styles.formatBtnText, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

function MessagePreview({
  message,
  colors,
}: {
  message: string;
  colors: ReturnType<typeof useColors>;
}) {
  const segments = useMemo(() => parseWhatsAppFormatting(message), [message]);

  return (
    <View
      style={[
        styles.previewBox,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.previewDir, { color: colors.foreground, writingDirection: "rtl" }]}>
        {segments.map((segment, index) => (
          <Text
            key={`${index}-${segment.text.slice(0, 8)}`}
            style={{
              fontWeight: segment.bold ? "800" : "400",
              fontStyle: segment.italic ? "italic" : "normal",
              textDecorationLine: segment.strike ? "line-through" : "none",
              fontFamily: segment.mono
                ? Platform.select({ web: "monospace", default: undefined })
                : undefined,
            }}
          >
            {segment.text}
          </Text>
        ))}
      </Text>
    </View>
  );
}

export default function AdminWhatsAppPage() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const compact = width <= 767;
  const pagePadding = adminPagePadding(compact);
  const contentMaxWidth = adminContentMaxWidth(compact);

  const messageInputRef = useRef<TextInput>(null);
  const [phonesText, setPhonesText] = useState("");
  const [senderName, setSenderName] = useState("");
  const [doctorNamesText, setDoctorNamesText] = useState("");
  const [message, setMessage] = useState(() =>
    buildDefaultWhatsAppInviteMessage("", ""),
  );
  const [messageDirty, setMessageDirty] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [showLoginReminder, setShowLoginReminder] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<
    Array<{ label: string; url: string }>
  >([]);
  const [pendingIndex, setPendingIndex] = useState(0);

  const recipients = useMemo(
    () => parseWhatsAppRecipients(doctorNamesText, phonesText),
    [doctorNamesText, phonesText],
  );

  const firstDoctorName = recipients[0]?.doctorName ?? doctorNamesText.split(",")[0]?.trim() ?? "";

  useEffect(() => {
    if (messageDirty) return;
    setMessage(buildDefaultWhatsAppInviteMessage(firstDoctorName, senderName));
  }, [firstDoctorName, senderName, messageDirty]);

  const applyFormatting = useCallback(
    (wrapper: [string, string]) => {
      const result = wrapTextSelection(message, selection, wrapper);
      setMessage(result.next);
      setMessageDirty(true);
      requestAnimationFrame(() => {
        messageInputRef.current?.setNativeProps?.({
          selection: {
            start: result.selectionStart,
            end: result.selectionEnd,
          },
        });
        setSelection({ start: result.selectionStart, end: result.selectionEnd });
      });
    },
    [message, selection],
  );

  const resetMessage = useCallback(() => {
    setMessage(buildDefaultWhatsAppInviteMessage(firstDoctorName, senderName));
    setMessageDirty(false);
  }, [firstDoctorName, senderName]);

  const openWhatsApp = useCallback(async (url: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      showErrorToast("Could not open WhatsApp", "Install WhatsApp or try again on web.");
      return;
    }
    await Linking.openURL(url);
  }, []);

  const handleSend = useCallback(() => {
    if (!senderName.trim()) {
      showErrorToast("Missing sender name", "Enter your name as the sender.");
      return;
    }
    if (!recipients.length) {
      showErrorToast(
        "Invalid recipients",
        "Enter comma-separated doctor names and phone numbers with country codes.",
      );
      return;
    }
    if (!message.trim() && !messageDirty) {
      showErrorToast("Empty message", "Write a message before sending.");
      return;
    }

    const queue = recipients.map((recipient) => {
      const body = messageDirty
        ? message
        : buildDefaultWhatsAppInviteMessage(recipient.doctorName, senderName);
      return {
        label: `${recipient.doctorName} (${recipient.normalizedPhone})`,
        url: buildWhatsAppUrl(recipient.normalizedPhone, body),
      };
    });

    setPendingQueue(queue);
    setPendingIndex(0);
    setShowLoginReminder(true);
  }, [senderName, recipients, message, messageDirty]);

  const confirmOpenWhatsApp = useCallback(() => {
    const current = pendingQueue[pendingIndex];
    if (!current) return;
    void openWhatsApp(current.url);
    if (pendingIndex + 1 < pendingQueue.length) {
      setPendingIndex((index) => index + 1);
      return;
    }
    setShowLoginReminder(false);
    setPendingQueue([]);
    setPendingIndex(0);
  }, [openWhatsApp, pendingIndex, pendingQueue]);

  const cancelWhatsAppQueue = useCallback(() => {
    setShowLoginReminder(false);
    setPendingQueue([]);
    setPendingIndex(0);
  }, []);

  return (
    <AdminShell
      title="WhatsApp"
      subtitle="Compose a doctor invitation and open it in WhatsApp Web or the mobile app."
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: pagePadding, maxWidth: contentMaxWidth },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.notice,
            { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}33` },
          ]}
        >
          <AlertCircle size={18} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.foreground }]}>
            {WHATSAPP_LOGIN_HINT}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recipient</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Comma-separated lists — pair by order: first name with first number, etc. Phones
            accept +20…, 0020…, or local 01… (Egypt).
          </Text>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            Doctor name(s)
          </Text>
          <AppTextInput
            value={doctorNamesText}
            onChangeText={setDoctorNamesText}
            placeholder="Dr Ahmed, Dr Sara"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            Phone number(s)
          </Text>
          <AppTextInput
            value={phonesText}
            onChangeText={setPhonesText}
            placeholder="+20 106 942 2355, +966 50 123 4567"
            keyboardType="phone-pad"
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[
              styles.input,
              styles.multiLineInput,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />
          {recipients.length ? (
            <View style={[styles.recipientList, { borderColor: colors.border }]}>
              {recipients.map((recipient) => (
                <Text
                  key={`${recipient.normalizedPhone}-${recipient.doctorName}`}
                  style={[styles.recipientRow, { color: colors.foreground }]}
                >
                  {recipient.doctorName} → {recipient.normalizedPhone}
                </Text>
              ))}
            </View>
          ) : phonesText.trim() ? (
            <Text style={[styles.normalizedPhone, { color: "#dc2626" }]}>
              No valid phone numbers detected — check country codes.
            </Text>
          ) : null}
          <AppTextInput
            value={senderName}
            onChangeText={setSenderName}
            placeholder="Sender name (your name)"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.messageHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Message</Text>
            <Pressable
              onPress={resetMessage}
              style={({ pressed }) => [
                styles.resetBtn,
                {
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <RotateCcw size={14} color={colors.mutedForeground} />
              <Text style={[styles.resetBtnText, { color: colors.mutedForeground }]}>
                Reset default
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Default is Arabic. Use *bold*, _italic_, ~strikethrough~ — same as WhatsApp formatting.
          </Text>
          <View style={styles.formatRow}>
            <FormatButton label="Bold *" onPress={() => applyFormatting(["*", "*"])} colors={colors} />
            <FormatButton label="Italic _" onPress={() => applyFormatting(["_", "_"])} colors={colors} />
            <FormatButton label="Strike ~" onPress={() => applyFormatting(["~", "~"])} colors={colors} />
          </View>
          <AppTextInput
            ref={messageInputRef}
            value={message}
            onChangeText={(value) => {
              setMessage(value);
              setMessageDirty(true);
            }}
            onSelectionChange={(event) => {
              setSelection(event.nativeEvent.selection);
            }}
            multiline
            placeholder="Message to the doctor"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.textarea,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
                textAlign: "right",
                writingDirection: "rtl",
              },
            ]}
          />
          <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>Preview</Text>
          <MessagePreview message={message} colors={colors} />
        </View>

        <Pressable
          onPress={handleSend}
          style={({ pressed }) => [
            styles.primaryBtn,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <MessageCircle size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>
            Open in WhatsApp{recipients.length > 1 ? ` (${recipients.length})` : ""}
          </Text>
          <ExternalLink size={16} color="#fff" />
        </Pressable>
      </ScrollView>

      {showLoginReminder ? (
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Log in to WhatsApp first
            </Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              {WHATSAPP_LOGIN_HINT}
            </Text>
            {pendingQueue[pendingIndex] ? (
              <Text style={[styles.modalRecipient, { color: colors.foreground }]}>
                {pendingQueue.length > 1
                  ? `Recipient ${pendingIndex + 1} of ${pendingQueue.length}: `
                  : "Recipient: "}
                {pendingQueue[pendingIndex].label}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                onPress={cancelWhatsAppQueue}
                style={[styles.modalSecondaryBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmOpenWhatsApp} style={styles.modalPrimaryBtn}>
                <Text style={styles.primaryBtnText}>
                  {pendingIndex + 1 < pendingQueue.length
                    ? `Open & next (${pendingIndex + 1}/${pendingQueue.length})`
                    : pendingQueue.length > 1
                      ? `Open last (${pendingQueue.length}/${pendingQueue.length})`
                      : "Continue to WhatsApp"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 20,
    gap: 16,
    width: "100%",
    alignSelf: "center",
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "web" ? 10 : 12,
    fontSize: 15,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  multiLineInput: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  normalizedPhone: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  recipientList: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  recipientRow: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  formatRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  formatBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  formatBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 220,
    textAlignVertical: "top",
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 4,
  },
  previewBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  previewDir: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: "right",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  modalRecipient: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalSecondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalPrimaryBtn: {
    flex: 1,
    backgroundColor: "#25D366",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
});
