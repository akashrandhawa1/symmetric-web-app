// Polyfill import.meta.env for Jest (Vite compatibility)
globalThis.import = globalThis.import || {};
globalThis.import.meta = globalThis.import.meta || {};
globalThis.import.meta.env = globalThis.import.meta.env || {};