export const AUTH_EVENTS = {
  LOGOUT: 'auth:logout',
  LOGIN:  'auth:login',
} as const

export interface AuthLogoutPayload { userId?: string }
export interface AuthLoginPayload  { userId: string; role: string }
