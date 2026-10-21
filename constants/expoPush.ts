/** Must match `app.json` → `expo.extra.eas.projectId` */
export const EXPO_EAS_PROJECT_ID = "0bb1b8ef-f01a-415a-9639-7788882cd311";

export const EXPO_PUSH_CHANNEL_ID = "chat-messages";
/** Bumped to -ring: Android freezes a channel's sound at creation time, so an
 *  existing install would keep the old default blip on a new id-less build. */
export const EXPO_VIDEO_CALL_CHANNEL_ID = "video-calls-ring";
