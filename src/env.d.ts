/**
 * TypeScript environment variable definitions.
 *
 * Extends Vite's ImportMetaEnv with custom environment variables
 * used by the application.
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Gemini API key for coach requests.
   * Set in .env.local as VITE_GEMINI_API_KEY
   */
  readonly VITE_GEMINI_API_KEY: string;

  /**
   * Mock mode flag for coach API.
   * Set to "1" to use canned responses instead of real API calls.
   */
  readonly VITE_MOCK_COACH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.svg' {
  import * as React from 'react';

  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;

  const src: string;
  export default src;
}
