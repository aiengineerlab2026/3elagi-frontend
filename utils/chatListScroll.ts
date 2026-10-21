import type { ChatMessage } from "@/domains/chat/types";
import type { FlatList, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { Platform } from "react-native";

const SOCKET_SCROLL_MESSAGE_TYPES = new Set<ChatMessage["type"]>([
  "image",
  "video",
  "medical_link",
]);

/** Stable token for the latest message — includes pending→confirmed transitions. */
export function buildChatLatestMessageToken(messages: ChatMessage[]): string {
  if (messages.length === 0) return "empty";
  const newest = messages[messages.length - 1];
  return `${newest.id}:${messages.length}:${newest.pending ? "p" : "c"}`;
}

/** Incoming peer messages and shared media/medical records always scroll to latest. */
export function shouldForceChatScrollOnNewMessage(
  isInitialBatch: boolean,
  newest: ChatMessage | undefined,
): boolean {
  if (isInitialBatch || !newest) return false;
  if (newest.senderId !== "me") return true;
  return SOCKET_SCROLL_MESSAGE_TYPES.has(newest.type);
}

type ChatListRef<T> = React.RefObject<FlatList<T> | null>;

function getWebScrollNode<T>(list: FlatList<T>): HTMLElement | null {
  const candidate = list as unknown as {
    getScrollableNode?: () => HTMLElement;
    getNativeScrollRef?: () => { getScrollableNode?: () => HTMLElement };
  };
  return (
    candidate.getScrollableNode?.() ??
    candidate.getNativeScrollRef?.()?.getScrollableNode?.() ??
    null
  );
}

/** Distance from the latest edge where we still treat the list as "stuck" to new messages. */
export const CHAT_STICK_THRESHOLD_PX = 72;

/** For inverted lists, offset ~0 is the latest edge. */
export function isChatStuckToLatest(
  event: NativeSyntheticEvent<NativeScrollEvent>,
  inverted: boolean,
  threshold = CHAT_STICK_THRESHOLD_PX,
): boolean {
  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
  if (inverted) {
    return contentOffset.y <= threshold;
  }
  const distanceFromEnd =
    contentSize.height - layoutMeasurement.height - contentOffset.y;
  return distanceFromEnd <= threshold;
}

/** Scroll a chat list so the newest message is visible (supports inverted lists). */
export function scrollChatToLatest<T>(
  listRef: ChatListRef<T>,
  inverted: boolean,
  animated = false,
  options?: { shouldContinue?: () => boolean },
) {
  const list = listRef.current;
  if (!list) return;

  const shouldContinue = options?.shouldContinue ?? (() => true);

  const scroll = () => {
    if (!shouldContinue()) return;

    // Already parked at the latest edge — writing the offset again only makes
    // the list jump, which is what the chat flicker looked like.
    if (Platform.OS === "web") {
      const node = getWebScrollNode(list);
      if (node) {
        const target = inverted ? 0 : node.scrollHeight;
        if (Math.abs(node.scrollTop - target) > 1) node.scrollTop = target;
        return;
      }
    }

    try {
      if (inverted) {
        list.scrollToOffset({ offset: 0, animated });
      } else {
        list.scrollToEnd({ animated });
      }
    } catch {
      // List may not be laid out yet.
    }
  };

  // One retry, late enough to cover a not-yet-laid-out list. Bursts of calls
  // (images finishing, text reflowing) collapse into a single pending retry
  // instead of each queueing its own storm of jumps.
  requestAnimationFrame(scroll);
  if (pendingRetry !== null) clearTimeout(pendingRetry);
  pendingRetry = setTimeout(() => {
    pendingRetry = null;
    scroll();
  }, 200);
}

let pendingRetry: ReturnType<typeof setTimeout> | null = null;
