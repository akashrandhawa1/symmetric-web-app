#!/usr/bin/env node
/**
 * WebSocket Server for Gemini Live Voice Coach
 *
 * Usage:
 *   npm run server
 *   or
 *   node server/index.ts
 */

import 'dotenv/config';
import { createLiveCoachGateway } from './ws/live-coach.js';

const PORT = parseInt(process.env.WS_PORT || '8889', 10);

console.log('Starting Gemini Live Voice Coach WebSocket Server...');
console.log(`PORT: ${PORT}`);
console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'set' : 'NOT SET'}`);

if (!process.env.GEMINI_API_KEY) {
  console.error('\n❌ ERROR: GEMINI_API_KEY environment variable is not set!');
  console.error('Set it in your .env file or export it:\n');
  console.error('  export GEMINI_API_KEY="your-key-here"\n');
  process.exit(1);
}

createLiveCoachGateway(PORT);

console.log(`\n✅ WebSocket server ready at ws://localhost:${PORT}`);
console.log('Waiting for client connections...\n');
