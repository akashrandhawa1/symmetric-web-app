import { createRequire } from 'module';
import { getAI } from '../lib/geminiClient';

const require = createRequire(import.meta.url);

export function assertGenAISurface() {
  const ai: any = getAI();
  const hasGenerateContent = typeof ai?.models?.generateContent === 'function';
  const hasGetGenerativeModel = typeof ai?.getGenerativeModel === 'function';
  const resolved = require.resolve('@google/genai');
  const surface = {
    hasModels: !!ai?.models,
    hasGenerateContent,
    hasGetGenerativeModel,
    resolved,
    node: process.version,
  };
  // eslint-disable-next-line no-console
  console.log('[GenAI] surface:', surface);
  if (!hasGenerateContent) {
    throw new Error('GenAI SDK mismatch: expected ai.models.generateContent (@google/genai).');
  }
}
