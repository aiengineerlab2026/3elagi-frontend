export type TimeAgo = {
  text: string;
  justNow: boolean;
};

/** Compact relative time for clinical dashboards (e.g. "12m", "2h", "3d"). */
export function formatTimeAgo(iso: string, locale: string): TimeAgo {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return { text: "", justNow: false };

  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) {
    return { text: locale === "ar" ? "الآن" : "now", justNow: true };
  }
  if (mins < 60) {
    return { text: locale === "ar" ? `${mins} د` : `${mins}m`, justNow: false };
  }

  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return { text: locale === "ar" ? `${hours} س` : `${hours}h`, justNow: false };
  }

  const days = Math.floor(hours / 24);
  return { text: locale === "ar" ? `${days} ي` : `${days}d`, justNow: false };
}
