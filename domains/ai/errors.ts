import type { Translations } from "@/constants/translations";

export const AI_RATE_LIMIT_CODE = "rate_limit";
export const AI_INSUFFICIENT_POINTS_CODE = "insufficient_points";

export function isAiRateLimitError(
  error?: string | null,
  code?: string | null,
): boolean {
  if (code === AI_RATE_LIMIT_CODE) return true;
  const lower = (error ?? "").toLowerCase();
  return (
    lower.includes("too many ai") ||
    lower.includes("message limit") ||
    lower.includes("rate limit")
  );
}

export function isAiInsufficientPointsError(
  error?: string | null,
  code?: string | null,
): boolean {
  if (code === AI_INSUFFICIENT_POINTS_CODE) return true;
  const lower = (error ?? "").toLowerCase();
  return (
    lower.includes("insufficient message points") ||
    lower.includes("insufficient points") ||
    lower.includes("insufficient credits")
  );
}

export function formatAiChatError(
  error: string | undefined,
  code: string | undefined,
  t: Translations,
): { message: string; isRateLimit: boolean; canRetry: boolean } {
  if (isAiRateLimitError(error, code)) {
    return {
      message: t.ai.rateLimit,
      isRateLimit: true,
      canRetry: false,
    };
  }

  if (isAiInsufficientPointsError(error, code)) {
    return {
      message: t.ai.insufficientCredits,
      isRateLimit: false,
      canRetry: false,
    };
  }

  return {
    message: error ?? t.ai.sendFailed,
    isRateLimit: false,
    canRetry: true,
  };
}
