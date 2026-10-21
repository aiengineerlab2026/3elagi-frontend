/** Layout helpers for Arabic (RTL) vs English (LTR). */
export function flexRow(isRTL: boolean): "row" | "row-reverse" {
  return isRTL ? "row-reverse" : "row";
}

/** Chat keeps WhatsApp-style LTR chrome even when the app locale is Arabic. */
export function chatFlexRow(): "row" {
  return "row";
}

export const chatLayoutDirection = { direction: "ltr" as const };

export function alignText(isRTL: boolean): "left" | "right" {
  return isRTL ? "right" : "left";
}

export function layoutDirection(isRTL: boolean): "rtl" | "ltr" {
  return isRTL ? "rtl" : "ltr";
}

export function localeTag(isRTL: boolean): string {
  return isRTL ? "ar-EG" : "en-US";
}
