export type SpeechRecognitionLike = {
  stop: () => void;
  abort: () => void;
};

export type WebSpeechSession = {
  getTranscript: () => string;
  stop: () => Promise<string>;
  abort: () => void;
};

export function isWebSpeechRecognitionSupported(): boolean {
  return false;
}

export function createWebSpeechSession(_options: {
  lang: string;
  continuous?: boolean;
  onStart?: () => void;
  onTranscript?: (text: string) => void;
  onNaturalEnd?: (text: string) => void;
  onEnd?: () => void;
  onError: (message: string) => void;
}): WebSpeechSession | null {
  return null;
}

export function stopWebSpeechRecognition(
  _recognition: SpeechRecognitionLike | null,
): void {}

export class WebMediaRecorderSession {
  async start(): Promise<void> {
    throw new Error("Web recording is not available on this platform.");
  }

  async stop(): Promise<{ blob: Blob; mimeType: string }> {
    throw new Error("Web recording is not available on this platform.");
  }
}
