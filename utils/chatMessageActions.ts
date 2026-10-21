import { ActionSheetIOS, Alert, Platform } from "react-native";
import type { ChatMessage } from "@/domains/chat/types";

const EDIT_WINDOW_MS = 15 * 60 * 1000;

function isOwnSentMessage(message: ChatMessage): boolean {
  if (message.senderId !== "me") return false;
  if (message.pending || message.failed) return false;
  if (message.id.startsWith("pending-")) return false;
  return true;
}

function isReceivedMessage(message: ChatMessage): boolean {
  if (message.senderId === "me") return false;
  if (message.pending || message.failed) return false;
  if (message.id.startsWith("pending-")) return false;
  return true;
}

function withinEditWindow(message: ChatMessage): boolean {
  const sentAt = new Date(message.createdAt).getTime();
  if (Number.isNaN(sentAt)) return false;
  return Date.now() - sentAt <= EDIT_WINDOW_MS;
}

export function canDeleteMessage(message: ChatMessage): boolean {
  return isOwnSentMessage(message);
}

export function canEditTextMessage(message: ChatMessage): boolean {
  return isOwnSentMessage(message) && message.type === "text" && withinEditWindow(message);
}

export function canChangeMedicalRecord(message: ChatMessage): boolean {
  return (
    isOwnSentMessage(message) &&
    message.type === "medical_link" &&
    !!message.medicalLink &&
    withinEditWindow(message)
  );
}

export function canToggleMessageRead(message: ChatMessage): boolean {
  return isReceivedMessage(message);
}

/** @deprecated use canEditTextMessage */
export function canEditMessage(message: ChatMessage): boolean {
  return canEditTextMessage(message);
}

export function showChatMessageActions({
  message,
  isRTL,
  onEditText,
  onChangeRecord,
  onDelete,
  onToggleRead,
}: {
  message: ChatMessage;
  isRTL: boolean;
  onEditText?: () => void;
  onChangeRecord?: () => void;
  onDelete?: () => void;
  onToggleRead?: () => void;
}) {
  const editTextLabel = isRTL ? "تعديل" : "Edit";
  const changeRecordLabel = isRTL ? "تغيير السجل" : "Change record";
  const deleteLabel = isRTL ? "حذف" : "Delete";
  const cancelLabel = isRTL ? "إلغاء" : "Cancel";
  const markUnreadLabel = isRTL ? "تمييز كغير مقروء" : "Mark as unread";
  const markReadLabel = isRTL ? "تمييز كمقروء" : "Mark as read";

  const canEditText = canEditTextMessage(message);
  const canChangeRecord = canChangeMedicalRecord(message);
  const canDelete = canDeleteMessage(message);
  const canToggleRead = canToggleMessageRead(message) && !!onToggleRead;

  const confirmDelete = () => {
    if (!onDelete) return;
    Alert.alert(
      isRTL ? "حذف الرسالة؟" : "Delete message?",
      isRTL ? "لا يمكن التراجع عن هذا الإجراء." : "This cannot be undone.",
      [
        { text: cancelLabel, style: "cancel" },
        { text: deleteLabel, style: "destructive", onPress: onDelete },
      ],
    );
  };

  const primaryActions: { label: string; onPress: () => void }[] = [];
  if (canEditText && onEditText) {
    primaryActions.push({ label: editTextLabel, onPress: onEditText });
  }
  if (canChangeRecord && onChangeRecord) {
    primaryActions.push({ label: changeRecordLabel, onPress: onChangeRecord });
  }
  if (canToggleRead) {
    primaryActions.push({
      label: message.readAt ? markUnreadLabel : markReadLabel,
      onPress: onToggleRead!,
    });
  }

  if (!primaryActions.length && !canDelete) return;

  if (Platform.OS === "ios") {
    const options = [
      ...primaryActions.map((a) => a.label),
      ...(canDelete ? [deleteLabel] : []),
      cancelLabel,
    ];
    const cancelButtonIndex = options.length - 1;
    const destructiveButtonIndex = canDelete ? options.length - 2 : -1;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        destructiveButtonIndex:
          destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
      },
      (index) => {
        if (index === undefined || index === cancelButtonIndex) return;
        if (canDelete && index === destructiveButtonIndex) {
          confirmDelete();
          return;
        }
        primaryActions[index]?.onPress();
      },
    );
    return;
  }

  const buttons = [
    ...primaryActions.map((a) => ({ text: a.label, onPress: a.onPress })),
    ...(canDelete
      ? [{ text: deleteLabel, style: "destructive" as const, onPress: confirmDelete }]
      : []),
    { text: cancelLabel, style: "cancel" as const },
  ];

  Alert.alert(isRTL ? "الرسالة" : "Message", undefined, buttons);
}
