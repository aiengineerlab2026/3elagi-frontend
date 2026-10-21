import { useEffect } from "react";
import { Platform } from "react-native";

const STYLE_ID = "assistant-voice-styles";

/** Injects `.is-talking` pulse for the 3elagi avatar on web. */
export function AssistantVoiceWebStyles() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .assistant-avatar.is-talking {
        animation: assistant-talk-pulse 0.84s ease-in-out infinite;
      }
      @keyframes assistant-talk-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
      .assistant-mic-btn.is-recording {
        background-color: #ef4444 !important;
        animation: assistant-record-pulse 0.84s ease-in-out infinite;
      }
      .assistant-voice-logo.is-recording {
        animation: assistant-record-pulse 0.84s ease-in-out infinite;
      }
      .assistant-voice-logo.is-talking {
        animation: assistant-talk-pulse 0.84s ease-in-out infinite;
      }
      @keyframes assistant-record-pulse {
        0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45); }
        50% { opacity: 0.82; box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return null;
}
