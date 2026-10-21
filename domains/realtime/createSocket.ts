import { io, type Socket } from "socket.io-client";
import { SOCKET_BASE } from "@/constants/api";

/**
 * Every app socket goes through here so they share one policy:
 * - `transports: ["websocket"]` — polling is disabled for all sockets.
 * - `forceNew: true` — each concern (presence, AI, each open chat) gets its own
 *   physical connection instead of multiplexing over a shared one.
 */
export function createSocket(accessToken?: string): Socket {
  return io(SOCKET_BASE, {
    transports: ["websocket"],
    forceNew: true,
    autoConnect: true,
    auth: accessToken ? { token: accessToken } : undefined,
  });
}
