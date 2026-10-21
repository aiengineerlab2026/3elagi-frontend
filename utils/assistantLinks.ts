import { router } from "expo-router";
import { closeAsk3elagiAi } from "@/domains/ai/widget-store";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Navigate in-app for assistant markdown links; return false to block default. */
export function handleAssistantLink(url: string): boolean {
  const path = normalizeAssistantLinkPath(url);

  const medicalId = path.match(/^\/medical\/([^/?#]+)/i)?.[1];
  if (medicalId && UUID_RE.test(medicalId)) {
    closeAsk3elagiAi();
    router.push({ pathname: "/medical/[id]", params: { id: medicalId } });
    return false;
  }

  const doctorName = path.match(/^\/doctor\/name\/([^/?#]+)/i)?.[1];
  if (doctorName) {
    closeAsk3elagiAi();
    router.push({
      pathname: "/doctor/name/[name]",
      params: { name: decodeURIComponent(doctorName) },
    });
    return false;
  }

  const doctorId = path.match(/^\/doctor\/([^/?#]+)/i)?.[1];
  if (doctorId && UUID_RE.test(doctorId)) {
    closeAsk3elagiAi();
    router.push({
      pathname: "/doctor/[doctorId]",
      params: { doctorId },
    });
    return false;
  }

  const chatUserId = path.match(/^\/chat\/([^/?#]+)/i)?.[1];
  if (chatUserId && UUID_RE.test(chatUserId)) {
    closeAsk3elagiAi();
    router.push({
      pathname: "/chat/[id]",
      params: { id: chatUserId },
    });
    return false;
  }

  return true;
}

function normalizeAssistantLinkPath(url: string): string {
  let trimmed = url.trim();
  try {
    trimmed = decodeURIComponent(trimmed);
  } catch {
    // keep raw
  }
  if (trimmed.startsWith("/")) {
    return trimmed.split(/[?#]/)[0];
  }
  try {
    const parsed = new URL(trimmed, "https://3elagi.local");
    return parsed.pathname;
  } catch {
    return trimmed.split(/[?#]/)[0];
  }
}
