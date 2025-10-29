import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { mockCoachApiPlugin } from './src/api/gemini/mockServer';
import fs from 'fs';

// Plugin to copy Netlify _redirects file to dist
function netlifyRedirectsPlugin() {
  return {
    name: 'netlify-redirects',
    closeBundle() {
      const redirectsContent = '/*    /index.html   200\n';
      fs.writeFileSync('dist/_redirects', redirectsContent);
      console.log('✓ Created _redirects file for Netlify');
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        mockCoachApiPlugin({ enabled: env.MOCK_COACH !== '0' }), // Mock API server for coach endpoint (disable with MOCK_COACH=0)
        netlifyRedirectsPlugin(), // Create _redirects for Netlify SPA routing
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.MOCK_COACH': JSON.stringify(env.MOCK_COACH || '1'),
        'process.env.NODE_ENV': JSON.stringify(mode),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
