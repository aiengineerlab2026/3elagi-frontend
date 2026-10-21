export const PRESENCE_EVENTS = {
  CONNECTED:    'presence:connected',
  DISCONNECTED: 'presence:disconnected',
} as const

export interface PresenceConnectedPayload { userId: string }
export interface PresenceDisconnectedPayload { userId?: string }
