import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { build } from 'esbuild';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const outDir = resolve(projectRoot, 'dist-tests');
const outFile = resolve(outDir, 'fatigue-tests.mjs');

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const stubGenAiPlugin = {
  name: 'stub-genai',
  setup(buildCtx) {
    buildCtx.onResolve({ filter: /^@google\/genai$/ }, () => ({
      path: 'stub-genai',
      namespace: 'stub-genai',
    }));
    buildCtx.onLoad({ filter: /.*/, namespace: 'stub-genai' }, () => ({
      contents: `
        export class GoogleGenAI {
          constructor() {}
          models = {
            generateContent: async () => {
              throw new Error('Gemini client is stubbed in tests');
            },
          };
        }
        export const Type = {
          OBJECT: 'object',
          ARRAY: 'array',
          STRING: 'string',
        };
      `,
      loader: 'ts',
    }));
  },
};

await build({
  entryPoints: [resolve(projectRoot, 'tests/index.ts')],
  outfile: outFile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node18'],
  sourcemap: false,
  logLevel: 'silent',
  plugins: [stubGenAiPlugin],
});

const moduleUrl = pathToFileURL(outFile).href;
const { runTests } = await import(moduleUrl);

if (typeof runTests === 'function') {
  await runTests();
  console.log('All tests passed.');
}
