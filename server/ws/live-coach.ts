/**
 * Voice Coach Gateway using Gemini Live API
 *
 * This server bridges WebSocket connections between:
 * Browser (client) <-> This Server <-> Gemini Live API
 */

import 'dotenv/config';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

type CoachContext = {
  readiness: number;
  sessionPhase: string;
  goal?: string;
  metrics?: {
    ror?: 'down' | 'stable' | 'up';
    symmetryPct?: number;
    rmsDropPct?: number;
  };
  lastSet?: {
    exercise: string;
    reps: number;
    rpe?: number;
    seconds?: number;
  };
  userFlags?: {
    tired?: boolean;
    pain?: boolean;
  };
};

type CoachEvent = {
  type: string;
  at: number;
  payload?: Record<string, unknown>;
};

const GEMINI_LIVE_API_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

type ClientSession = {
  clientWs: WebSocket;
  geminiWs: WebSocket | null;
  apiKey: string;
  context?: CoachContext;
  events: CoachEvent[];
  contextPrimedToken: number;
};

const formatNumber = (value?: number | null, suffix = ''): string | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return `${Math.round(value)}${suffix}`;
};

const summariseContext = (ctx?: CoachContext, events: CoachEvent[] = []): string | null => {
  if (!ctx) return null;
  const lines: string[] = [];
  lines.push(`Context: phase=${ctx.sessionPhase}; readiness=${Math.round(ctx.readiness)}; goal=${ctx.goal ?? 'build_strength'}`);
  const symmetry = formatNumber(ctx.metrics?.symmetryPct, '%');
  const fatigue = formatNumber(ctx.metrics?.rmsDropPct, '%');
  const ror = ctx.metrics?.ror;
  if (symmetry) lines.push(`Symmetry ${symmetry}`);
  if (fatigue) lines.push(`Fatigue ${fatigue}`);
  if (ror) lines.push(`Rate of recovery trend ${ror}`);
  if (ctx.userFlags?.tired) lines.push('Athlete reported feeling tired');
  if (ctx.userFlags?.pain) lines.push('Athlete reported pain or discomfort');
  if (ctx.lastSet) {
    const { exercise, reps, rpe } = ctx.lastSet;
    const parts = [`Last set: ${exercise}`, `reps=${reps}`];
    if (typeof rpe === 'number') parts.push(`RPE ${rpe}`);
    lines.push(parts.join(', '));
  }
  if (events.length) {
    const eventLines = events
      .slice(-5)
      .map((event) => `• ${event.type}${event.payload ? ` ${JSON.stringify(event.payload)}` : ''}`);
    lines.push('Recent events:');
    lines.push(...eventLines);
  }
  return lines.join('\n');
};

const primeGeminiWithContext = (session: ClientSession) => {
  if (!session.geminiWs || session.geminiWs.readyState !== WebSocket.OPEN) return;
  const summary = summariseContext(session.context, session.events);
  if (!summary) return;
  session.contextPrimedToken += 1;
  session.geminiWs.send(
    JSON.stringify({
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text: `${summary}\nUse this context when coaching.` }],
          },
        ],
        turnComplete: false,
      },
    }),
  );
};

const updateSessionContext = (session: ClientSession, context?: CoachContext, events?: CoachEvent[]) => {
  if (context) {
    session.context = context;
  }
  if (Array.isArray(events)) {
    session.events = events;
  }
};

const SYSTEM_INSTRUCTION = {
  parts: [{
    text: `You are a warm, encouraging strength training coach.

Guidelines:
- Keep responses concise (1-3 sentences)
- Use natural, conversational language
- Be encouraging but honest about training advice
- Ask clarifying questions when needed
- Reference the user's context (readiness, recent exercises, fatigue)
- No medical diagnosis or injury treatment

Your goal is to help the user train effectively while managing recovery and avoiding injury.`
  }]
};

export function createLiveCoachGateway(port: number) {
  const httpServer = createServer();
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', async (clientWs, request) => {
    console.log('[LiveCoach] Client connected');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[LiveCoach] GEMINI_API_KEY not set');
      clientWs.send(JSON.stringify({
        type: 'error',
        code: 'missing_api_key',
        message: 'Server configuration error: GEMINI_API_KEY not set'
      }));
      clientWs.close();
      return;
    }

    const session: ClientSession = {
      clientWs,
      geminiWs: null,
      apiKey,
      events: [],
      contextPrimedToken: 0,
    };

    // Connect to Gemini Live API
    try {
      const geminiUrl = `${GEMINI_LIVE_API_URL}?key=${apiKey}`;
      const geminiWs = new WebSocket(geminiUrl);
      session.geminiWs = geminiWs;

      geminiWs.on('open', () => {
        console.log('[LiveCoach] Connected to Gemini Live API');

        // Send setup message to Gemini
        const setupMessage = {
          setup: {
            model: 'models/gemini-2.0-flash-exp',
            generation_config: {
              response_modalities: ['AUDIO'],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: 'Kore'
                  }
                }
              }
            },
            system_instruction: SYSTEM_INSTRUCTION
          }
        };

        geminiWs.send(JSON.stringify(setupMessage));
        console.log('[LiveCoach] Sent setup to Gemini');
      });

      geminiWs.on('message', (data) => {
        // Forward Gemini responses to client
        try {
          const message = JSON.parse(data.toString());
          console.log('[LiveCoach] Gemini -> Client:', JSON.stringify(message).substring(0, 200));

          // Transform Gemini Live API format to our client format
          if (message.setupComplete) {
            clientWs.send(JSON.stringify({ type: 'ready' }));
          } else if (message.serverContent?.modelTurn) {
            const turn = message.serverContent.modelTurn;

            // Handle transcription (what user said)
            if (turn.parts) {
              for (const part of turn.parts) {
                if (part.text) {
                  clientWs.send(JSON.stringify({
                    type: 'final_stt',
                    text: part.text
                  }));
                }

                // Handle audio response
                if (part.inlineData?.mimeType?.startsWith('audio/pcm')) {
                  // Gemini sends base64 encoded PCM audio (24kHz)
                  console.log('[LiveCoach] Sending audio to client, size:', part.inlineData.data.length);
                  const audioData = Buffer.from(part.inlineData.data, 'base64');
                  clientWs.send(audioData);
                }
              }
            }
          } else if (message.serverContent?.turnComplete) {
            clientWs.send(JSON.stringify({ type: 'assistant_audio_end' }));
          }
        } catch (err) {
          console.error('[LiveCoach] Error processing Gemini message:', err);
        }
      });

      geminiWs.on('error', (error) => {
        console.error('[LiveCoach] Gemini WebSocket error:', error);
        clientWs.send(JSON.stringify({
          type: 'error',
          code: 'gemini_error',
          message: 'Connection to AI service failed'
        }));
      });

      geminiWs.on('close', (code, reason) => {
        console.log('[LiveCoach] Gemini connection closed, code:', code, 'reason:', reason.toString());
        clientWs.close();
      });

    } catch (error) {
      console.error('[LiveCoach] Failed to connect to Gemini:', error);
      clientWs.send(JSON.stringify({
        type: 'error',
        code: 'connection_failed',
        message: 'Failed to connect to AI service'
      }));
      clientWs.close();
      return;
    }

    // Handle client messages
    clientWs.on('message', async (data) => {
      console.log('[LiveCoach] Received from client:', typeof data, data instanceof Buffer ? `Buffer(${data.length})` : 'string');

      if (!session.geminiWs || session.geminiWs.readyState !== WebSocket.OPEN) {
        console.error('[LiveCoach] Gemini not connected');
        return;
      }

      // Handle JSON messages from client
      if (typeof data === 'string' || (data instanceof Buffer && data.length < 500)) {
        try {
          const text = typeof data === 'string' ? data : data.toString('utf8');
          const message = JSON.parse(text);
          console.log('[LiveCoach] Client message:', message.type);

          switch (message.type) {
            case 'context_update':
              updateSessionContext(session, message.context, message.events);
              primeGeminiWithContext(session);
              break;
            case 'ptt_start':
              updateSessionContext(session, message.context, message.events);
              primeGeminiWithContext(session);
              console.log('[LiveCoach] PTT started, ready for audio');
              break;

            case 'audio_end':
              // End of audio stream - Don't send anything to Gemini
              // Gemini will automatically detect the end of speech and respond
              console.log('[LiveCoach] Audio stream ended, waiting for Gemini response');
              break;

            case 'barge_in':
              // Interrupt Gemini
              session.geminiWs.send(JSON.stringify({
                clientContent: {
                  turnComplete: true
                }
              }));
              break;

            case 'user_turn':
              // Text-based turn
              if (message.text) {
                updateSessionContext(session, message.context, message.events);
                primeGeminiWithContext(session);
                const summary = summariseContext(session.context, session.events);
                const promptText = summary
                  ? `${summary}\n\nAthlete said: ${message.text}`
                  : message.text;
                session.geminiWs.send(JSON.stringify({
                  clientContent: {
                    turns: [{
                      role: 'user',
                      parts: [{ text: promptText }]
                    }],
                    turnComplete: true
                  }
                }));
              }
              break;
          }
        } catch (err) {
          // Not JSON, might be audio buffer
        }
      }

      // Handle audio data from client
      if (data instanceof Buffer && data.length >= 500) {
        console.log('[LiveCoach] Sending audio chunk to Gemini, size:', data.length);
        // Client sends PCM16 audio at 16kHz
        // Convert to base64 and send to Gemini
        const base64Audio = data.toString('base64');
        session.geminiWs.send(JSON.stringify({
          realtimeInput: {
            audio: {
              mimeType: 'audio/pcm;rate=16000',
              data: base64Audio
            }
          }
        }));
      }
    });

    clientWs.on('close', () => {
      console.log('[LiveCoach] Client disconnected');
      if (session.geminiWs) {
        session.geminiWs.close();
      }
    });

    clientWs.on('error', (error) => {
      console.error('[LiveCoach] Client WebSocket error:', error);
    });
  });

  httpServer.listen(port, () => {
    console.log(`[LiveCoach] Server listening on :${port}`);
  });

  return { server: httpServer, wss };
}

// Start server if run directly
const port = Number(process.env.COACH_WS_PORT ?? 8787);
createLiveCoachGateway(port);
