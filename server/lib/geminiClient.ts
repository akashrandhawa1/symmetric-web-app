import { GoogleGenAI } from '@google/genai';

let ai: GoogleGenAI | undefined;

function assertServer() {
  if (typeof window !== 'undefined') {
    throw new Error('Gemini client must run on the server.');
  }
}

export function getAI(): GoogleGenAI {
  assertServer();
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or VITE_GEMINI_API_KEY is missing');
  }
  if (!ai) {
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function generateText(model: string, contents: string): Promise<string> {
  if (/-live$/.test(model)) {
    throw new Error('Live models must use the WebSocket Live API; do not call generateText with a *-live model.');
  }
  const res = await getAI().models.generateContent({ model, contents });
  return res.text ?? '';
}

export async function* generateTextStream(model: string, contents: string) {
  if (/-live$/.test(model)) {
    throw new Error('Live models must use the WebSocket Live API.');
  }
  const stream = await getAI().models.generateContentStream({ model, contents });
  for await (const chunk of stream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

export function _resetForTests() {
  ai = undefined;
}
