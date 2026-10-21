import { REGISTER_URL } from "@/domains/admin/marketingSections";

export function buildDefaultWhatsAppInviteMessage(
  doctorName: string,
  senderName: string,
): string {
  const doctor = doctorName.trim() || "الدكتور";
  const sender = senderName.trim() || "الفريق";

  return [
    `مرحباً دكتور ${doctor}،`,
    "",
    `معك *${sender}* من *3elagi*.`,
    "",
    "أدعوك للانضمام إلى *3elagi* — منصة طبية عن بُعد للمرضى من منطقة الخليج والشرق الأوسط.",
    "",
    `🔗 *سجّل معنا:* ${REGISTER_URL}`,
    "",
    "نحن في *المرحلة الأولية* من الإطلاق، وندعوك للانضمام مبكراً. *الانضمام المبكر* يمنحك مزايا عديدة.",
    "",
    "نتطلع للتعاون معك!",
  ].join("\n");
}

/**
 * Normalize for wa.me — digits only, no + or 00 prefix.
 * Accepts +20…, 0020…, or local 01… (Egypt) / 07… (Jordan).
 */
export function normalizeWhatsAppPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  // 00201069422355 → 201069422355 (strip international 00 prefix)
  while (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // Local Egypt mobile: 01069422355 → 201069422355
  if (digits.startsWith("0") && digits.length === 11 && digits[1] === "1") {
    digits = `20${digits.slice(1)}`;
  }

  // Local Jordan mobile: 079xxxxxxx → 96279xxxxxxx
  if (digits.startsWith("0") && digits.length === 10 && digits[1] === "7") {
    digits = `962${digits.slice(1)}`;
  }

  return digits;
}

export function isValidWhatsAppPhone(digits: string): boolean {
  return digits.length >= 8 && digits.length <= 15;
}

export function buildWhatsAppUrl(phoneDigits: string, message: string): string {
  const encoded = encodeURIComponent(message.trim());
  return `https://wa.me/${phoneDigits}?text=${encoded}`;
}

export type WhatsAppFormattedSegment = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  mono?: boolean;
};

/** Parse WhatsApp-style formatting for preview (*bold*, _italic_, ~strike~, ```mono```). */
export function parseWhatsAppFormatting(text: string): WhatsAppFormattedSegment[] {
  const segments: WhatsAppFormattedSegment[] = [];
  const pattern = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|```[^`\n]+```)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushPlain = (value: string) => {
    if (value) segments.push({ text: value });
  };

  while ((match = pattern.exec(text)) !== null) {
    pushPlain(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith("*") && token.endsWith("*")) {
      segments.push({ text: token.slice(1, -1), bold: true });
    } else if (token.startsWith("_") && token.endsWith("_")) {
      segments.push({ text: token.slice(1, -1), italic: true });
    } else if (token.startsWith("~") && token.endsWith("~")) {
      segments.push({ text: token.slice(1, -1), strike: true });
    } else if (token.startsWith("```") && token.endsWith("```")) {
      segments.push({ text: token.slice(3, -3), mono: true });
    } else {
      pushPlain(token);
    }
    lastIndex = match.index + token.length;
  }

  pushPlain(text.slice(lastIndex));
  return segments.length ? segments : [{ text }];
}

export type WhatsAppRecipient = {
  doctorName: string;
  phone: string;
  normalizedPhone: string;
};

/** Pair comma-separated doctor names with comma-separated phone numbers by index. */
export function parseWhatsAppRecipients(
  namesRaw: string,
  phonesRaw: string,
): WhatsAppRecipient[] {
  const names = parseCommaList(namesRaw);
  const phoneParts = parseCommaList(phonesRaw);
  if (!phoneParts.length) return [];

  const recipients: WhatsAppRecipient[] = [];
  for (let i = 0; i < phoneParts.length; i += 1) {
    const normalizedPhone = normalizeWhatsAppPhone(phoneParts[i]);
    if (!isValidWhatsAppPhone(normalizedPhone)) continue;
    recipients.push({
      doctorName: names[i]?.trim() || names[0]?.trim() || "الدكتور",
      phone: phoneParts[i],
      normalizedPhone,
    });
  }
  return recipients;
}

function parseCommaList(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function wrapTextSelection(
  text: string,
  selection: { start: number; end: number },
  wrapper: [string, string],
  placeholder = "نص",
): { next: string; selectionStart: number; selectionEnd: number } {
  const start = Math.max(0, Math.min(selection.start, text.length));
  const end = Math.max(start, Math.min(selection.end, text.length));
  const selected = text.slice(start, end) || placeholder;
  const [open, close] = wrapper;
  const wrapped = `${open}${selected}${close}`;
  const next = text.slice(0, start) + wrapped + text.slice(end);
  const cursorStart = start + open.length;
  const cursorEnd = cursorStart + selected.length;
  return { next, selectionStart: cursorStart, selectionEnd: cursorEnd };
}
