/** Keys stored in API `improvement_tags` — labels live in translations.rateUs.suggestions */
export const APP_REVIEW_IMPROVEMENT_TAGS = [
  "ease_of_use",
  "performance",
  "design",
  "video",
  "chat",
  "support",
  "features",
  "mobile",
  "arabic",
] as const;

export type AppReviewImprovementTag = (typeof APP_REVIEW_IMPROVEMENT_TAGS)[number];
