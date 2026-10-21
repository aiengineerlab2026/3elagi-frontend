import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { Paperclip, Trash2, Mail } from "lucide-react-native";
import { AppBackButton } from "@/components/nav/AppBackButton";
import { navigateBack } from "@/utils/appNavigation";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTextInput } from "@/components/AppTextInput";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import {
  submitContactMessage,
  type ContactAttachment,
} from "@/domains/contact/api";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { flexRow } from "@/utils/rtl";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

const MAX_FILES = 5;

export default function ContactScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const textAlign = isRTL ? "right" : "left";
  const accessToken = useAuthStore((s) => s.accessToken);
  const profile = useAuthStore((s) => s.profile);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<ContactAttachment[]>([]);
  const [sending, setSending] = useState(false);

  const pickFiles = async () => {
    if (files.length >= MAX_FILES) {
      showErrorToast(t.contact.tooManyFiles);
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: "*/*",
    });
    if (result.canceled) return;
    const next = result.assets
      .slice(0, MAX_FILES - files.length)
      .map((asset) => ({
        uri: asset.uri,
        mimeType: asset.mimeType || "application/octet-stream",
        fileName: asset.name || "attachment",
        webFile:
          Platform.OS === "web" && "file" in asset
            ? (asset as { file?: File }).file
            : undefined,
      }));
    setFiles((prev) => [...prev, ...next].slice(0, MAX_FILES));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 5) {
      showErrorToast(t.contact.messageTooShort);
      return;
    }
    if (!accessToken) {
      showErrorToast(t.contact.sendFailed);
      return;
    }
    setSending(true);
    try {
      await submitContactMessage({
        token: accessToken,
        message: trimmed,
        name: profile?.name,
        email: profile?.email,
        files,
      });
      showSuccessToast(t.contact.sent);
      setMessage("");
      setFiles([]);
      navigateBack(router, "/(tabs)");
    } catch (e) {
      showErrorToast(
        t.contact.sendFailed,
        e instanceof Error ? e.message : undefined,
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: colors.border,
            flexDirection: dir,
          },
        ]}
      >
        <AppBackButton
          color={colors.foreground}
          hitSlop={12}
          style={styles.backBtn}
          fallback="/(tabs)"
          accessibilityLabel={t.common.cancel}
        />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t.contact.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardSafeScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.intro, { flexDirection: dir }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
            <Mail size={20} color={colors.primary} />
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}>
            {t.contact.subtitle}
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.foreground, textAlign }]}>
          {t.contact.messageLabel}
        </Text>
        <AppTextInput
          value={message}
          onChangeText={setMessage}
          placeholder={t.contact.messagePlaceholder}
          multiline
          style={[
            styles.messageInput,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
              textAlign,
            },
          ]}
        />

        <Text style={[styles.label, { color: colors.foreground, textAlign, marginTop: 16 }]}>
          {t.contact.attachments}
        </Text>
        <Pressable
          onPress={() => void pickFiles()}
          style={({ pressed }) => [
            styles.attachBtn,
            {
              flexDirection: dir,
              borderColor: colors.primary,
              backgroundColor: pressed ? `${colors.primary}12` : colors.card,
            },
          ]}
        >
          <Paperclip size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: "700" }}>
            {t.contact.addFiles}
          </Text>
        </Pressable>
        <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
          {t.contact.attachmentsHint}
        </Text>

        {files.map((file, index) => (
          <View
            key={`${file.fileName}-${index}`}
            style={[
              styles.fileRow,
              {
                flexDirection: dir,
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[styles.fileName, { color: colors.foreground, textAlign }]}
              numberOfLines={1}
            >
              {file.fileName}
            </Text>
            <Pressable onPress={() => removeFile(index)} hitSlop={8}>
              <Trash2 size={18} color={colors.destructive} />
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={() => void submit()}
          disabled={sending}
          style={[
            styles.sendBtn,
            {
              backgroundColor: sending ? colors.mutedForeground : colors.primary,
              marginTop: 24,
            },
          ]}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendText}>{t.contact.send}</Text>
          )}
        </Pressable>
      </KeyboardSafeScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "800" },
  body: { padding: 20, paddingBottom: 40 },
  intro: { alignItems: "flex-start", gap: 12, marginBottom: 20 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: { flex: 1, fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  messageInput: {
    minHeight: 140,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },
  attachBtn: {
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  hint: { fontSize: 12, marginTop: 8 },
  fileRow: {
    marginTop: 10,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fileName: { flex: 1, fontSize: 13, fontWeight: "600" },
  sendBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  sendText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
