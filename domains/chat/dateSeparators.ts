import type { ChatMessage } from "./types";

export type ChatListItem =
  | { kind: "date"; dateKey: string; label: string }
  | { kind: "message"; message: ChatMessage };

export function chatDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const LOCALE_TAGS: Record<string, string> = {
  en: "en-US",
  ar: "ar-EG",
  de: "de-DE",
  es: "es-ES",
};

function localeTag(locale: string): string {
  return LOCALE_TAGS[locale] ?? "en-US";
}

export function formatChatDayLabel(
  dayKey: string,
  locale: string,
  labels: { today: string; yesterday: string },
): string {
  const todayKey = chatDayKey(new Date().toISOString());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = chatDayKey(yesterdayDate.toISOString());

  if (dayKey === todayKey) return labels.today;
  if (dayKey === yesterdayKey) return labels.yesterday;

  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
  };
  if (y !== new Date().getFullYear()) {
    options.year = "numeric";
  }
  return new Intl.DateTimeFormat(localeTag(locale), options).format(date);
}

/** Messages must be newest-first (inverted FlatList). */
export function injectChatDateSeparators(
  messagesNewestFirst: ChatMessage[],
  locale: string,
  labels: { today: string; yesterday: string },
): ChatListItem[] {
  const out: ChatListItem[] = [];
  let i = 0;

  while (i < messagesNewestFirst.length) {
    const day = chatDayKey(messagesNewestFirst[i].createdAt);
    while (
      i < messagesNewestFirst.length &&
      chatDayKey(messagesNewestFirst[i].createdAt) === day
    ) {
      out.push({ kind: "message", message: messagesNewestFirst[i] });
      i += 1;
    }
    out.push({
      kind: "date",
      dateKey: day,
      label: formatChatDayLabel(day, locale, labels),
    });
  }

  return out;
}

export function chatListItemKey(row: ChatListItem): string {
  return row.kind === "date" ? `date-${row.dateKey}` : row.message.id;
}
