import type { AiMessage } from "@/domains/ai/types";

export const AI_ATTACHED_DOC_MARKER = "[Attached document contents]";
export const AI_ATTACHMENT_ONLY_PLACEHOLDER = "Please review the attachment.";

/** User-visible text only — hides embedded PDF/DOCX extraction. */
export function stripAiAttachmentContent(content: string): string {
  const idx = content.indexOf(AI_ATTACHED_DOC_MARKER);
  const head = idx >= 0 ? content.slice(0, idx) : content;
  return head.trim();
}

function userVisibleText(content: string, hasAttachment: boolean): string {
  const text = stripAiAttachmentContent(content);
  if (hasAttachment && text === AI_ATTACHMENT_ONLY_PLACEHOLDER) return "";
  return text;
}

export function getAiUserMessageDisplay(message: AiMessage): {
  text: string;
  attachmentLabel: string | null;
} {
  const attachmentLabel =
    message.fileName?.trim() ||
    (message.attachmentUrl ? guessFileNameFromUrl(message.attachmentUrl) : null);
  const hasAttachment = Boolean(
    attachmentLabel ||
      message.attachmentUrl ||
      message.imageUri ||
      message.imageUrl,
  );
  const text = userVisibleText(message.content, hasAttachment);
  return { text, attachmentLabel };
}

function guessFileNameFromUrl(url: string): string {
  try {
    const path = url.split("?")[0] ?? url;
    const segment = path.split("/").pop() ?? "";
    if (segment) return decodeURIComponent(segment);
  } catch {
    // ignore
  }
  return "attachment";
}
