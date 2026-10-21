/** YouTube video IDs for the documentation page. */
export const DOCUMENTATION_GENERAL_INTRODUCTION_YOUTUBE_ID = "Ac95jJ7KyZE";
export const DOCUMENTATION_TEXT_PAYMENT_YOUTUBE_ID = "20BUr4enuws";
export const DOCUMENTATION_VIDEO_CONSULTATION_YOUTUBE_ID = "_-0zgFM3sDI";

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export type DocumentationVideoKey =
  | "generalIntroduction"
  | "textConsultationPayment"
  | "videoConsultation";

export type DocumentationVideo = {
  key: DocumentationVideoKey;
  youtubeId: string;
  /** Optional callout above the embed (translation key under documentation). */
  noteKey?: "payOnDoctorBankNote";
};

export const DOCUMENTATION_VIDEOS: DocumentationVideo[] = [
  {
    key: "generalIntroduction",
    youtubeId: DOCUMENTATION_GENERAL_INTRODUCTION_YOUTUBE_ID,
  },
  {
    key: "textConsultationPayment",
    youtubeId: DOCUMENTATION_TEXT_PAYMENT_YOUTUBE_ID,
    noteKey: "payOnDoctorBankNote",
  },
  {
    key: "videoConsultation",
    youtubeId: DOCUMENTATION_VIDEO_CONSULTATION_YOUTUBE_ID,
  },
];

export const DOCUMENTATION_PAGE_URL =
  "https://www.3elagi.net/documentation";
