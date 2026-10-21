/** Mirrors 3eyadahub-api/src/mail/marketing-email-sections.ts */
export const REGISTER_URL = "https://www.3elagi.net/register-with-us";

export function registerWithUsUrl(email?: string | null): string {
  const trimmed = email?.trim().toLowerCase();
  if (!trimmed) return REGISTER_URL;
  return `${REGISTER_URL}?email=${encodeURIComponent(trimmed)}`;
}
export const ANDROID_APP_URL =
  "https://play.google.com/apps/internaltest/4700519020943782529";

export const MARKETING_SECTION_TYPES = [
  "heading",
  "paragraph",
  "feature_box",
  "callout",
  "screenshots",
  "cta",
  "custom",
] as const;

export type MarketingSectionType = (typeof MARKETING_SECTION_TYPES)[number];
export type MarketingCalloutVariant = "accent" | "soft" | "highlight";

export interface MarketingEmailSection {
  id: string;
  type: MarketingSectionType;
  html?: string;
  title?: string;
  items?: string[];
  variant?: MarketingCalloutVariant;
  buttonLabel?: string;
  buttonUrl?: string;
}

export const SECTION_TYPE_LABELS: Record<MarketingSectionType, string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  feature_box: "Feature list",
  callout: "Callout box",
  screenshots: "Screenshots grid",
  cta: "Call to action",
  custom: "Custom HTML",
};

export function createMarketingSectionId(): string {
  return `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptySection(type: MarketingSectionType): MarketingEmailSection {
  const id = createMarketingSectionId();
  switch (type) {
    case "heading":
      return { id, type, html: "Dear Dr. {{name}}," };
    case "paragraph":
      return { id, type, html: "Your paragraph text…" };
    case "feature_box":
      return { id, type, title: "Features", items: ["First feature"] };
    case "callout":
      return { id, type, variant: "soft", title: "Callout title", html: "Callout body…" };
    case "screenshots":
      return { id, type, title: "Platform screenshots" };
    case "cta":
      return {
        id,
        type,
        html: "Ready to join?",
        buttonLabel: "Register your interest",
        buttonUrl: "{{register_url}}",
      };
    case "custom":
      return { id, type, html: "<div>Custom HTML block</div>" };
    default:
      return { id, type: "paragraph", html: "" };
  }
}

export function moveSection(
  sections: MarketingEmailSection[],
  index: number,
  direction: -1 | 1,
): MarketingEmailSection[] {
  const next = direction === -1 ? index - 1 : index + 1;
  if (next < 0 || next >= sections.length) return sections;
  const copy = [...sections];
  [copy[index], copy[next]] = [copy[next], copy[index]];
  return copy;
}
