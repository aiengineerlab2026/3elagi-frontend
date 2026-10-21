const LINK_CATALOG_LINE =
  /(?:^|\n)\s*(?:[-*]\s*)?Link:\s*(\/(?:medical|doctor)\/[^\s|]+)\s*\|\s*([^\n]+)/gi;

const BARE_ASSISTANT_PATH = /(\/(?:medical|doctor)\/[a-zA-Z0-9-]+)/g;

function isInsideMarkdownLink(full: string, offset: number): boolean {
  const before = full.slice(0, offset);
  const open = before.lastIndexOf("](");
  if (open === -1) return false;
  const close = full.indexOf(")", offset);
  return close !== -1;
}

/** Normalize assistant text so doctor/record paths render as markdown links. */
export function prepareAssistantMarkdown(text: string): string {
  let result = text.trim();
  if (!result) return result;

  result = result.replace(LINK_CATALOG_LINE, "[$2]($1)");
  result = result.replace(BARE_ASSISTANT_PATH, (path, _g1, offset, full) => {
    if (isInsideMarkdownLink(full, offset)) return path;
    const label = path.startsWith("/doctor/")
      ? "View doctor profile"
      : "View medical record";
    return `[${label}](${path})`;
  });

  return result;
}
