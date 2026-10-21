export { usePresenceStore } from './store'
export {
  connectPresenceSocket,
  disconnectPresenceSocket,
  announcePresenceLogin,
  announcePresenceLogout,
  getPresenceSocket,
  emitChatTyping,
  emitChatStopTyping,
  onChatMessageNew,
  onChatMessageDeleted,
  onConsultationRemoved,
  onChatMessageUpdated,
  onChatTyping,
  onChatStopTyping,
  onChatAccessUpdated,
  onMessageEmotionUpdated,
  onDoctorRegistered,
} from './socket'
export { PRESENCE_EVENTS } from './events'
export type { LoggedInUser } from './types'
