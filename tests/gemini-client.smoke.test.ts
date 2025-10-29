import { afterAll, beforeEach, describe, expect, test } from 'vitest';
import { getAI, _resetForTests } from '../server/lib/geminiClient';

const ORIGINAL_KEY = process.env.GEMINI_API_KEY;

beforeEach(() => {
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? 'test-key';
  _resetForTests();
});

afterAll(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = ORIGINAL_KEY;
  }
  _resetForTests();
});

describe('GenAI client surfaces', () => {
  test('GenAI surface: models.generateContent exists', () => {
    const ai: any = getAI();
    expect(typeof ai.models.generateContent).toBe('function');
  });

  test('Legacy API is not present', () => {
    const ai: any = getAI();
    expect(ai.getGenerativeModel).toBeUndefined();
  });
});
