import type { ChatUser } from "./types";

let usersCache: ChatUser[] = [];

export const chatRepository = {
  getAllUsers(): ChatUser[] {
    return [...usersCache];
  },

  getUser(userId: string): ChatUser | undefined {
    return usersCache.find((u) => u.id === userId);
  },

  cacheUsers(users: ChatUser[]) {
    for (const user of users) {
      const idx = usersCache.findIndex((u) => u.id === user.id);
      if (idx >= 0) {
        usersCache[idx] = { ...usersCache[idx], ...user };
      } else {
        usersCache.push(user);
      }
    }
  },

  clearUsers() {
    usersCache = [];
  },
};
