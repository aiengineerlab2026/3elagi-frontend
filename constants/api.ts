const API_HOST =
  process.env.EXPO_PUBLIC_API_HOST ??
  "https://service-3elagi-q45gskkjsa-ew.a.run.app";

export const SOCKET_BASE = API_HOST.replace(/\/$/, "");

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? `${SOCKET_BASE}/3eyadahub-api`;
