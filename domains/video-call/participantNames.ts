export type VideoParticipantRole = "patient" | "doctor";

type FormatVideoParticipantNameInput = {
  role: VideoParticipantRole;
  name?: string | null;
  roleLabel: string;
  fallbackName?: string;
};

/** Daily + in-app labels: "Patient Jane", "Doctor Ahmed", … */
export function formatVideoParticipantName({
  role,
  name,
  roleLabel,
  fallbackName,
}: FormatVideoParticipantNameInput): string {
  const trimmed = name?.trim();
  const display = trimmed || fallbackName?.trim() || roleLabel;
  // Name missing (or literally the role word): show the role once, not twice.
  if (display.toLowerCase() === roleLabel.toLowerCase()) return roleLabel;
  const prefixPattern = new RegExp(`^${escapeRegExp(roleLabel)}\\s+`, "i");
  if (prefixPattern.test(display)) return display;
  return `${roleLabel} ${display}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
