type CallArgs = {
  model: string;
  system: string;
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  jsonSchema?: object;
};

export async function callGemini(_args: CallArgs): Promise<string> {
  // TODO: integrate real SDK. For now, assume a fetch-like interface.
  // Return raw model text (JSON string).
  throw new Error("Integrate Gemini SDK here");
}

export type LiveSession = {
  send: (text: string) => void;
  onMessage: (cb: (deltaText: string) => void) => void;
  interrupt: () => void;
  close: () => Promise<void>;
};

export async function openGeminiLiveSession(_model: string): Promise<LiveSession> {
  // TODO: integrate real live/WS client.
  throw new Error("Integrate Gemini Live SDK here");
}
