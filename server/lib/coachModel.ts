import { generateText } from './geminiClient';

type CoachModelOption = 'flash' | 'pro' | undefined;

export async function coachTextReply(prompt: string, opts?: { model?: CoachModelOption }) {
  const modelName = opts?.model === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  return generateText(modelName, prompt);
}
