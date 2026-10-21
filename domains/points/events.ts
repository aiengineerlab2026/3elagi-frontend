export const POINTS_EVENTS = {
  REFRESH: 'points:refresh',
  CLEARED: 'points:cleared',
} as const

export interface PointsRefreshPayload { token: string }
export interface PointsClearedPayload {}
