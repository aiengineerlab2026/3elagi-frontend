export { useChatStore } from './store'
export type { MessageRow } from './api'
export { chatRepository } from './repository'
export { CHAT_EVENTS } from './events'
export { applyLivePresence, presenceSortWeight, formatPresenceLabel, presenceTextColor } from './presence'
export { applyPresenceToConversations, buildConversationFromPeer } from './presenceConversations'
export { defaultAvatarUrl, resolveMediaUrl, resolveAvatarUrl } from './avatar'
export { fetchDoctorPatientAccess, canDoctorViewPatientRecords, accessActionLabel } from './access'
export type {
  ChatMessage,
  ChatUser,
  Conversation,
  SendMessageInput,
  MedicalLinkMeta,
  AccessActionMeta,
  AccessActionType,
  ChatMessageType,
  Presence,
} from './types'
export type { ChatMessageSentPayload } from './events'
export type { DoctorPatientAccessStatus } from './access'
