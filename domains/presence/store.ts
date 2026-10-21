import { create } from "zustand";
import type { LoggedInUser } from "./types";

interface PresenceState {
  users: Record<string, LoggedInUser>;
  setUsers: (users: LoggedInUser[]) => void;
  addUser: (user: LoggedInUser) => void;
  removeUser: (userId: string) => void;
  clear: () => void;
  isOnline: (userId: string) => boolean;
  /** Doctor call lines, live from the socket. Absent = fall back to fetched flag. */
  busyDoctors: Record<string, boolean>;
  setDoctorBusy: (doctorUserId: string, busy: boolean) => void;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  users: {},
  setUsers: (users) =>
    set((state) => {
      const next = Object.fromEntries(users.map((u) => [u.id, u]));
      // On every socket reconnect the server resends the full presence list.
      // Skip the state update (and the re-render of every consumer) when the
      // set of online users hasn't actually changed.
      const prevKeys = Object.keys(state.users);
      if (
        prevKeys.length === Object.keys(next).length &&
        prevKeys.every((id) => next[id])
      ) {
        return state;
      }
      return { users: next };
    }),
  addUser: (user) =>
    set((state) => ({
      users: { ...state.users, [user.id]: user },
    })),
  removeUser: (userId) =>
    set((state) => {
      const next = { ...state.users };
      delete next[userId];
      return { users: next };
    }),
  clear: () => set({ users: {}, busyDoctors: {} }),
  isOnline: (userId) => Boolean(get().users[userId]),
  busyDoctors: {},
  setDoctorBusy: (doctorUserId, busy) =>
    set((state) =>
      state.busyDoctors[doctorUserId] === busy
        ? state
        : { busyDoctors: { ...state.busyDoctors, [doctorUserId]: busy } },
    ),
}));
