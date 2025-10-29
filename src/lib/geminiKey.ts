/**
 * Shared helpers for resolving the Gemini API key from multiple runtime sources.
 * Ensures the key only contains ISO-8859-1 characters (required for HTTP headers).
 */

function sanitizeHeaderValue(value: string): string {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code > 0xff) {
      throw new Error(
        'Gemini API key contains unsupported characters. Re-copy the key from Google AI Studio.',
      );
    }
  }
  return value;
}

export function resolveGeminiApiKey(): string | null {
  try {
    let metaEnv: any = undefined;
    try {
      metaEnv = (0, eval)(
        "typeof import !== 'undefined' && import.meta && import.meta.env ? import.meta.env : undefined",
      );
    } catch {
      // ignore eval errors (e.g., CSP or non-module environments)
    }

    const keyFromMeta =
      metaEnv?.VITE_GEMINI_API_KEY ?? metaEnv?.VITE_API_KEY ?? metaEnv?.GEMINI_API_KEY;
    if (typeof keyFromMeta === 'string' && keyFromMeta.trim()) {
      return sanitizeHeaderValue(keyFromMeta.trim());
    }

    if (typeof globalThis !== 'undefined') {
      const globalKey =
        (globalThis as any)?.__GEMINI_KEY__ ?? (globalThis as any)?.GEMINI_API_KEY;
      if (typeof globalKey === 'string' && globalKey.trim()) {
        return sanitizeHeaderValue(globalKey.trim());
      }
    }

    if (typeof localStorage !== 'undefined') {
      const storedKey =
        localStorage.getItem('GEMINI_API_KEY') ?? localStorage.getItem('VITE_GEMINI_API_KEY');
      if (typeof storedKey === 'string' && storedKey.trim()) {
        return sanitizeHeaderValue(storedKey.trim());
      }
    }

    if (typeof process !== 'undefined' && typeof process?.env === 'object') {
      const { GEMINI_API_KEY, VITE_GEMINI_API_KEY, VITE_API_KEY, API_KEY } = process.env as Record<
        string,
        string | undefined
      >;
      const keyFromProcess = GEMINI_API_KEY ?? VITE_GEMINI_API_KEY ?? VITE_API_KEY ?? API_KEY;
      if (typeof keyFromProcess === 'string' && keyFromProcess.trim()) {
        return sanitizeHeaderValue(keyFromProcess.trim());
      }
    }
  } catch (error) {
    console.warn('Unable to resolve Gemini API key:', error);
  }
  return null;
}
