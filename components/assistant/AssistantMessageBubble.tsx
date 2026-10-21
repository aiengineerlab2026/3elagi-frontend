import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { FileText } from "lucide-react-native";
import Markdown from "react-native-markdown-display";
import { SpokenHighlightText } from "@/components/assistant/SpokenHighlightText";
import { AssistantLoadingIndicator } from "@/components/assistant/AssistantLoadingIndicator";
import { AssistantMessageActions } from "@/components/assistant/AssistantMessageActions";
import type { AiMessage } from "@/domains/ai/types";
import type { AiFeedbackType } from "@/domains/emotions/types";
import { surfaceCard, UI } from "@/constants/uiTokens";
import { useColors } from "@/hooks/useColors";
import { AiBookingCard } from "@/components/assistant/AiBookingCard";
import { AiConsultationCard } from "@/components/assistant/AiConsultationCard";
import {
  getAiUserMessageDisplay,
} from "@/utils/aiMessageDisplay";
import { handleAssistantLink } from "@/utils/assistantLinks";
import { parseBookingDirective } from "@/utils/assistantBooking";
import { parseConsultationDirective } from "@/utils/assistantConsultation";
import { prepareAssistantMarkdown } from "@/utils/assistantMarkdown";
import { stripMarkdownForTts } from "@/utils/stripMarkdownForTts";
import { splitSpokenWords } from "@/utils/spokenWords";

interface Props {
  message: AiMessage;
  compact?: boolean;
  selfUserId?: string | null;
  spokenWordIndex?: number | null;
  isReadingAloud?: boolean;
  isRTL?: boolean;
  onFeedback?: (emotion: AiFeedbackType) => void;
  onReadAloud?: () => void;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function canReactToAiMessage(message: AiMessage): boolean {
  return (
    message.role === "assistant" &&
    !message.pending &&
    !message.id.startsWith("draft-") &&
    !message.id.startsWith("local-")
  );
}

function AssistantMessageBubbleBase({
  message,
  compact = false,
  selfUserId,
  spokenWordIndex = null,
  isReadingAloud = false,
  isRTL = false,
  onFeedback,
  onReadAloud,
}: Props) {
  const colors = useColors();
  const isUser = message.role === "user";
  // In RTL locales the conversation mirrors: assistant on the right, user on the
  // left, and text reads right-to-left.
  const alignEnd = isUser ? !isRTL : isRTL;
  const rowAlign = { alignItems: alignEnd ? "flex-end" : "flex-start" } as const;
  // Align to the locale side; let each script keep its natural bidi order (no
  // writingDirection override, which would mangle Latin text in RTL mode).
  const textAlign = isRTL ? "right" : "left";
  const isLoading = message.pending && !message.content?.trim();
  const showFeedback = canReactToAiMessage(message);
  const showAssistantActions =
    !isUser && !message.pending && !!message.content?.trim();
  const myFeedback = message.emotions?.find((row) => row.userId === selfUserId)
    ?.emotion as AiFeedbackType | undefined;
  const isSpeaking =
    spokenWordIndex != null && spokenWordIndex >= 0 && !isUser;
  const spokenWords = isSpeaking
    ? splitSpokenWords(stripMarkdownForTts(message.content || ""))
    : [];
  const imageSource = message.imageUri ?? message.imageUrl;
  // Assistant replies may carry booking / consultation fences; strip them so
  // cards render below the text and raw JSON never shows.
  const booking = isUser
    ? { directive: null, text: message.content || "" }
    : parseBookingDirective(message.content || "");
  const consultation = isUser
    ? { directive: null, text: booking.text }
    : parseConsultationDirective(booking.text);
  const assistantText = isUser ? message.content || "" : consultation.text;
  const userDisplay = isUser ? getAiUserMessageDisplay(message) : null;
  const userText = userDisplay?.text ?? "";
  const attachmentLabel = userDisplay?.attachmentLabel ?? null;
  const attachmentUrl = message.attachmentUrl?.trim() || null;

  const openAttachment = () => {
    if (!attachmentUrl) return;
    void Linking.openURL(attachmentUrl);
  };

  if (isLoading) {
    return (
      <View style={[compact ? styles.rowCompact : styles.row, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
        <AssistantLoadingIndicator compact />
      </View>
    );
  }

  return (
    <View
      style={[compact ? styles.rowCompact : styles.row, rowAlign]}
    >
      <View
        style={[
          styles.bubbleWrap,
          rowAlign,
          { maxWidth: compact ? 420 : 560 },
        ]}
      >
        <View
          style={[
            compact ? styles.bubbleCompact : styles.bubble,
            isUser
              ? { backgroundColor: colors.primary }
              : [surfaceCard(colors.card, colors.border), styles.assistantBubble],
          ]}
        >
          {isUser ? (
            <>
              {imageSource ? (
                <Image
                  source={{ uri: imageSource }}
                  style={styles.messageImage}
                  contentFit="cover"
                  transition={120}
                />
              ) : null}
              {!imageSource && attachmentLabel ? (
                <Pressable
                  onPress={attachmentUrl ? openAttachment : undefined}
                  disabled={!attachmentUrl}
                  accessibilityRole="link"
                  accessibilityLabel={attachmentLabel}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.fileChip,
                    (pressed || hovered) && attachmentUrl
                      ? styles.fileChipPressed
                      : null,
                  ]}
                >
                  <FileText color={colors.primaryForeground} size={18} />
                  <Text
                    style={[
                      styles.fileChipText,
                      {
                        color: colors.primaryForeground,
                        textDecorationLine: attachmentUrl ? "underline" : "none",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {attachmentLabel}
                  </Text>
                </Pressable>
              ) : null}
              {userText ? (
                <Text
                  style={[
                    styles.text,
                    {
                      color: colors.primaryForeground,
                      marginTop: imageSource || attachmentLabel ? 8 : 0,
                      textAlign,
                    },
                  ]}
                >
                  {userText}
                </Text>
              ) : null}
            </>
          ) : isSpeaking ? (
            <SpokenHighlightText
              words={spokenWords}
              activeIndex={spokenWordIndex ?? 0}
              color={colors.foreground}
              highlightColor={colors.primary}
            />
          ) : (
            <Markdown
              onLinkPress={handleAssistantLink}
              style={{
                body: { color: colors.foreground, fontSize: 15, lineHeight: 25, textAlign },
                textgroup: { textAlign },
                paragraph: { marginTop: 0, marginBottom: 12, lineHeight: 25, textAlign },
                heading1: {
                  color: colors.foreground,
                  fontSize: 21,
                  fontWeight: "700",
                  lineHeight: 30,
                  marginTop: 6,
                  marginBottom: 10,
                },
                heading2: {
                  color: colors.foreground,
                  fontSize: 18,
                  fontWeight: "700",
                  lineHeight: 27,
                  marginTop: 6,
                  marginBottom: 8,
                },
                heading3: {
                  color: colors.foreground,
                  fontSize: 16,
                  fontWeight: "700",
                  lineHeight: 24,
                  marginTop: 4,
                  marginBottom: 6,
                },
                heading4: {
                  color: colors.foreground,
                  fontSize: 15,
                  fontWeight: "700",
                  lineHeight: 22,
                  marginTop: 4,
                  marginBottom: 6,
                },
                strong: { fontWeight: "700", color: colors.foreground },
                em: { fontStyle: "italic" },
                bullet_list: { marginTop: 2, marginBottom: 12 },
                ordered_list: { marginTop: 2, marginBottom: 12 },
                list_item: { marginBottom: 6, lineHeight: 25 },
                bullet_list_icon: { marginRight: 8, color: colors.primary },
                ordered_list_icon: { marginRight: 8, color: colors.primary },
                blockquote: {
                  backgroundColor: colors.muted,
                  borderColor: colors.primary,
                  borderLeftWidth: 3,
                  borderRadius: 8,
                  marginVertical: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                },
                hr: {
                  backgroundColor: colors.border,
                  height: StyleSheet.hairlineWidth,
                  marginVertical: 12,
                },
                code_inline: {
                  backgroundColor: colors.muted,
                  color: colors.foreground,
                  borderRadius: 5,
                  paddingHorizontal: 5,
                  fontSize: 14,
                },
                fence: {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderRadius: 10,
                  padding: 12,
                  marginVertical: 8,
                },
                code_block: {
                  backgroundColor: colors.muted,
                  borderRadius: 10,
                  padding: 12,
                  marginVertical: 8,
                },
                link: { color: colors.primary, textDecorationLine: "underline" },
              }}
            >
              {prepareAssistantMarkdown(assistantText || " ")}
            </Markdown>
          )}
          <Text
            style={[
              styles.time,
              { color: isUser ? colors.primaryForeground : colors.mutedForeground },
            ]}
          >
            {formatTime(message.createdAt)}
          </Text>
        </View>

        {!isUser && booking.directive ? (
          <AiBookingCard directive={booking.directive} />
        ) : null}
        {!isUser && consultation.directive ? (
          <AiConsultationCard directive={consultation.directive} />
        ) : null}

        {showAssistantActions ? (
          <AssistantMessageActions
            content={message.content}
            myFeedback={myFeedback}
            onFeedback={showFeedback ? onFeedback : undefined}
            onReadAloud={onReadAloud}
            isReadingAloud={isReadingAloud}
            disabled={message.pending}
          />
        ) : null}
      </View>
    </View>
  );
}

// Memoized: during streaming only the last assistant message object changes
// (patchAssistantMessage keeps other message references stable), so this skips
// re-rendering every other bubble on each token. onFeedback identity is
// intentionally ignored — it closes over a stable store callback.
export const AssistantMessageBubble = React.memo(
  AssistantMessageBubbleBase,
  (prev, next) =>
    prev.message === next.message &&
    prev.compact === next.compact &&
    prev.selfUserId === next.selfUserId &&
    prev.spokenWordIndex === next.spokenWordIndex &&
    prev.isReadingAloud === next.isReadingAloud &&
    prev.isRTL === next.isRTL,
);

const styles = StyleSheet.create({
  row: { marginBottom: UI.space.md, paddingHorizontal: UI.space.md },
  rowCompact: { marginBottom: UI.space.sm, paddingHorizontal: UI.space.sm + 4 },
  bubbleWrap: {
    position: "relative",
    gap: UI.space.sm,
    width: "100%",
  },
  bubble: {
    maxWidth: "100%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  assistantBubble: {
    shadowOpacity: 0,
    elevation: 0,
  },
  bubbleCompact: {
    maxWidth: "100%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  text: { fontSize: 15, lineHeight: 22 },
  messageImage: {
    width: 220,
    maxWidth: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    cursor: "pointer" as "auto",
  },
  fileChipPressed: {
    opacity: 0.85,
  },
  fileChipText: {
    fontSize: 13,
    flexShrink: 1,
    fontWeight: "600",
  },
  time: { fontSize: 11, marginTop: 6, alignSelf: "flex-end" },
});
