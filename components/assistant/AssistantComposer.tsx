import { FileText, Mic, Paperclip, Plus, ScanLine, Send, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import {
  MOBILE_WEB_COMPOSER_FOOTER_GAP,
  mobileWebComposerStyles,
} from "@/constants/mobileWebComposer";
import { UI } from "@/constants/uiTokens";
import { useColors } from "@/hooks/useColors";
import { useFieldDictation } from "@/hooks/useFieldDictation";
import { handleEnterToSendMessage } from "@/utils/enterToSendMessage";
import { useI18n } from "@/hooks/useI18n";

interface Props {
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
  bottomInset?: number;
  compact?: boolean;
  onSend: (text: string) => void;
  isRTL?: boolean;
  /** General AI attachment (image or PDF) sent to the model with the caption. */
  aiAttachment?: { previewUri?: string; name: string; isPdf: boolean } | null;
  onAttachAiFile?: () => void;
  /** Native only: attach via the document scanner. */
  onScanAiFile?: () => void;
  aiAttachLoading?: boolean;
  onRemoveAiAttachment?: () => void;
}
export function AssistantComposer({
  disabled,
  sending,
  placeholder = "Ask about your medical records…",
  bottomInset = 0,
  compact = false,
  onSend,
  isRTL = false,
  aiAttachment = null,
  onAttachAiFile,
  onScanAiFile,
  aiAttachLoading = false,
  onRemoveAiAttachment,
}: Props) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const colors = useColors();
  const { t, isRTL: localeRTL } = useI18n();
  const [text, setText] = useState("");
  const dictation = useFieldDictation({ value: text, onChangeText: setText });
  const isDictating = dictation.listening;
  const micLoading = dictation.busy;
  const recordPulse = useRef(new Animated.Value(1)).current;
  const rowRTL = isRTL || localeRTL;
  const isMobileWeb = Platform.OS === "web" && compact;
  const bottomPadding = isMobileWeb
    ? MOBILE_WEB_COMPOSER_FOOTER_GAP + bottomInset
    : Math.max(bottomInset, 0) || 4;

  const submit = () => {
    const value = text.trim();
    if (disabled || sending) return;
    if (aiAttachment) {
      onSend(value);
      setText("");
      return;
    }
    if (!value) return;
    onSend(value);
    setText("");
  };

  const micBtnDisabled =
    disabled || (micLoading && !isDictating) || sending;

  const sendDisabled =
    disabled || sending || (!text.trim() && !aiAttachment);
  useEffect(() => {
    if (!isDictating) {
      recordPulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(recordPulse, {
          toValue: 0.55,
          duration: 520,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(recordPulse, {
          toValue: 1,
          duration: 520,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [isDictating, recordPulse]);

  const micWebProps =
    Platform.OS === "web"
      ? ({
          className: ["assistant-mic-btn", isDictating ? "is-recording" : null]
            .filter(Boolean)
            .join(" "),
        } as { className?: string })
      : {};

  const iconBtnStyle = compact ? styles.iconCompact : styles.icon;
  const iconBtnMobile = isMobileWeb ? styles.iconMobileWeb : null;
  const glyphSize = 15;

  const micButton = (
    <Animated.View style={{ opacity: isDictating ? recordPulse : 1 }}>
      <Pressable
        onPress={dictation.toggle}
        disabled={micBtnDisabled}
        accessibilityRole="button"
        accessibilityLabel={
          isDictating
            ? rowRTL
              ? "إيقاف الميكروفون"
              : "Stop mic"
            : rowRTL
              ? "الميكروفون"
              : "Mic"
        }
        {...micWebProps}
        style={[
          iconBtnStyle,
          iconBtnMobile,
          {
            backgroundColor: isDictating
              ? "#ef4444"
              : micLoading
                ? colors.primary
                : colors.background,
            opacity: micBtnDisabled ? 0.45 : 1,
          },
        ]}
      >
        {micLoading ? (
          <ActivityIndicator color={colors.primaryForeground} size="small" />
        ) : (
          <Mic
            color={isDictating || micLoading ? "#fff" : colors.primary}
            size={glyphSize}
          />
        )}
      </Pressable>
    </Animated.View>
  );

  const aiAttachButton = onAttachAiFile ? (
    <Pressable
      onPress={onAttachAiFile}
      disabled={disabled || sending || aiAttachLoading}
      accessibilityRole="button"
      accessibilityLabel="Attach image or PDF"
      style={[
        iconBtnStyle,
        iconBtnMobile,
        {
          backgroundColor: colors.background,
          opacity: disabled || sending || aiAttachLoading ? 0.45 : 1,
        },
      ]}
    >
      {aiAttachLoading ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <Paperclip color={colors.primary} size={glyphSize} />
      )}
    </Pressable>
  ) : null;

  const scanButton = onScanAiFile ? (
    <Pressable
      onPress={onScanAiFile}
      disabled={disabled || sending || aiAttachLoading}
      accessibilityRole="button"
      accessibilityLabel="Scan document"
      style={[
        iconBtnStyle,
        iconBtnMobile,
        {
          backgroundColor: colors.background,
          opacity: disabled || sending || aiAttachLoading ? 0.45 : 1,
        },
      ]}
    >
      <ScanLine color={colors.primary} size={glyphSize} />
    </Pressable>
  ) : null;

  const sheetActions = [
    onScanAiFile
      ? {
          key: "camera",
          label: t.records.composerCamera,
          icon: <ScanLine color={colors.primary} size={20} />,
          onPress: onScanAiFile,
        }
      : null,
    onAttachAiFile
      ? {
          key: "attach",
          label: t.records.composerAttach,
          icon: <Paperclip color={colors.primary} size={20} />,
          onPress: onAttachAiFile,
        }
      : null,
  ].filter((action): action is NonNullable<typeof action> => !!action);
  const extraActions = sheetActions;

  const plusButton = extraActions.length ? (
    <Pressable
      onPress={() => setActionsOpen((open) => !open)}
      accessibilityRole="button"
      accessibilityState={{ expanded: actionsOpen }}
      style={[iconBtnStyle, iconBtnMobile, { borderColor: colors.border }]}
    >
      <Plus color={colors.primary} size={glyphSize} />
    </Pressable>
  ) : null;

  const trailingActions = (
    <View style={styles.actionsRow}>
      <Pressable
        onPress={submit}
        disabled={sendDisabled}
        style={[
          iconBtnStyle,
          iconBtnMobile,
          {
            backgroundColor: colors.primary,
            opacity: sendDisabled ? 0.45 : 1,
          },
        ]}
      >
        {sending ? (
          <ActivityIndicator color={colors.primaryForeground} size="small" />
        ) : (
          <Send color={colors.primaryForeground} size={glyphSize} />
        )}
      </Pressable>
    </View>
  );

  const aiAttachmentPreview =
    aiAttachment && onRemoveAiAttachment ? (
      <View style={[styles.aiPreview, { borderColor: colors.border, backgroundColor: colors.background }]}>
        {aiAttachment.isPdf || !aiAttachment.previewUri ? (
          <FileText color={colors.primary} size={20} />
        ) : (
          <Image source={{ uri: aiAttachment.previewUri }} style={styles.aiPreviewThumb} />
        )}
        <Text style={{ color: colors.foreground, fontSize: 13, flex: 1 }} numberOfLines={1}>
          {aiAttachment.name}
        </Text>
        <Pressable onPress={onRemoveAiAttachment} hitSlop={8}>
          <X color={colors.mutedForeground} size={16} />
        </Pressable>
      </View>
    ) : null;

  if (isMobileWeb) {
    return (
      <View
        style={[
          mobileWebComposerStyles.shell,
          {
            paddingBottom: bottomPadding,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        {aiAttachmentPreview}
        <View style={[mobileWebComposerStyles.row, { alignItems: "center" }]}>
          {aiAttachButton}
          {micButton}
          <AppTextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
            multiline
            editable={!disabled && !sending}
            blurOnSubmit={false}
            onKeyPress={(e) => handleEnterToSendMessage(e, submit)}
            style={[
              mobileWebComposerStyles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.muted,
              },
            ]}
          />
          {trailingActions}
        </View>
        {isDictating ? (
          <Text style={[styles.listeningHint, { color: colors.mutedForeground }]}>
            {rowRTL
              ? "جاري الاستماع… تكلم ثم اضغط الميكروفون للإيقاف"
              : "Listening… speak, then tap mic to stop"}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[
        compact ? styles.wrapCompact : styles.wrap,
        {
          borderTopColor: colors.border,
          backgroundColor: colors.card,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      {aiAttachmentPreview}
      <View style={styles.composerRow}>
        {plusButton}
        {compact ? aiAttachButton : null}
        {micButton}
        <AppTextInput
          value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline
        editable={!disabled && !sending}
        blurOnSubmit={false}
        onKeyPress={(e) => handleEnterToSendMessage(e, submit)}
        style={[
          compact ? styles.inputCompact : styles.input,
          {
            color: colors.foreground,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      />
      {trailingActions}
      </View>
      {isDictating ? (
        <Text style={[styles.listeningHint, { color: colors.mutedForeground }]}>
          {rowRTL
            ? "جاري الاستماع… تكلم ثم اضغط الميكروفون للإيقاف"
            : "Listening… speak, then tap mic to stop"}
        </Text>
      ) : null}
      <Modal
        visible={actionsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setActionsOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setActionsOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetGrip, { backgroundColor: colors.border }]} />
            {sheetActions.map((action) => (
              <Pressable
                key={action.key}
                onPress={() => {
                  setActionsOpen(false);
                  action.onPress();
                }}
                style={({ pressed }) => [
                  styles.sheetRow,
                  {
                    flexDirection: isRTL ? "row-reverse" : "row",
                    backgroundColor: pressed ? colors.muted : "transparent",
                  },
                ]}
              >
                <View style={[styles.sheetIcon, { backgroundColor: `${colors.primary}14` }]}>
                  {action.icon}
                </View>
                <Text style={[styles.sheetLabel, { color: colors.foreground }]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: UI.space.md,
    paddingTop: UI.space.sm + 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: UI.space.sm,
  },
  wrapCompact: {
    paddingHorizontal: UI.space.sm + 4,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  aiPreviewThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 28,
    paddingHorizontal: 12,
    gap: 4,
  },
  sheetGrip: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 10,
  },
  sheetRow: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  sheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetLabel: { fontSize: 15, fontWeight: "600" },
  listeningHint: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: UI.radius.inner,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  inputCompact: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: UI.radius.inner,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconMobileWeb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
