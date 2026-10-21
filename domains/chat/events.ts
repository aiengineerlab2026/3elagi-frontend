export const CHAT_EVENTS = {
  MESSAGE_SENT: 'chat:message_sent',
  MESSAGE_RECEIVED: 'chat:message_received',
  DOCUMENT_REQUEST_RECEIVED: 'chat:document_request_received',
  CLEARED:      'chat:cleared',
} as const

export interface ChatMessageSentPayload { token: string }

export interface ChatMessageReceivedPayload {
  peerId: string;
  senderName: string;
  preview: string;
  messageId: string;
}

/** A doctor asked the patient for a lab result / x-ray. */
export interface DocumentRequestReceivedPayload {
  peerId: string;
  requestId: string;
  requestType: 'lab' | 'xray';
  title: string;
  doctorName: string;
}

export interface ChatClearedPayload {}
