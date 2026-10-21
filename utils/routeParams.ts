/** Normalize expo-router search params (`string | string[]`) to a single trimmed string. */
export function readRouteParam(
  value: string | string[] | undefined | null,
): string {
  if (value == null) return "";
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}
