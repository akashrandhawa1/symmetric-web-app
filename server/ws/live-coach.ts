/**
 * Voice Coach Gateway using Gemini Live API
 *
 * This server bridges WebSocket connections between:
 * Browser (client) <-> This Server <-> Gemini Live API
 */

import 'dotenv/config';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

type CoachSessionSummary = {
  date: string | number;
  readinessPre: number;
  readinessPost: number;
  effectiveReps: number;
  balanceScore: number;
  exercises?: string[];
};

type CoachPlanSet = {
  exercise: string;
  blockLabel?: string | null;
  setNumber?: number | null;
  totalSets?: number | null;
  reps?: string | null;
  tempo?: string | null;
  restSeconds?: number | null;
  loadAdjustment?: string | null;
};

type CoachPlanContext = {
  intent?: string | null;
  totalSets?: number | null;
  completedSets?: number | null;
  remainingSets?: number | null;
  last?: CoachPlanSet | null;
  next?: CoachPlanSet | null;
};

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
  sessionHistory?: CoachSessionSummary[];
  plan?: CoachPlanContext | null;
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
  lastContextSummary?: string | null;
};

const formatNumber = (value?: number | null, suffix = ''): string | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return `${Math.round(value)}${suffix}`;
};

const summariseContext = (ctx?: CoachContext, events: CoachEvent[] = []): string | null => {
  if (!ctx) return null;
  const lines: string[] = [];

  // Current state
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

  const describePlanSet = (set: CoachPlanSet | null | undefined): string | null => {
    if (!set) return null;
    const parts: string[] = [];
    const setLabel = set.setNumber && set.totalSets
      ? `set ${set.setNumber}/${set.totalSets}`
      : set.setNumber
        ? `set ${set.setNumber}`
        : null;
    const baseName = set.exercise ?? 'set';
    const name = set.blockLabel ? `${baseName} (${set.blockLabel})` : baseName;
    parts.push(name);
    if (setLabel) parts.push(setLabel);
    if (set.reps) parts.push(`${set.reps} reps`);
    if (set.tempo) parts.push(`tempo ${set.tempo}`);
    if (typeof set.restSeconds === 'number' && Number.isFinite(set.restSeconds)) {
      parts.push(`rest ${Math.round(set.restSeconds)}s`);
    }
    if (set.loadAdjustment && set.loadAdjustment !== 'n/a') {
      parts.push(`load ${set.loadAdjustment}`);
    }
    return parts.join(', ');
  };

  // Session history (last 2 workouts for speed)
  if (ctx.sessionHistory && ctx.sessionHistory.length > 0) {
    lines.push('');
    lines.push('Recent workouts:');
    ctx.sessionHistory.slice(-2).reverse().forEach((session) => {
      // Parse date
      let timestampMs = Date.now();
      if (typeof session.date === 'number') {
        timestampMs = session.date > 10000000000 ? session.date : session.date * 1000;
      } else if (typeof session.date === 'string') {
        timestampMs = new Date(session.date).getTime();
      }

      const daysAgo = Math.floor((Date.now() - timestampMs) / (1000 * 60 * 60 * 24));
      const timeLabel = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo}d ago`;

      const parts: string[] = [timeLabel];
      parts.push(`readiness ${session.readinessPre}→${session.readinessPost}`);
      if (session.effectiveReps > 0) parts.push(`${session.effectiveReps} effective reps`);
      if (session.balanceScore > 0) parts.push(`balance ${Math.round(session.balanceScore)}%`);

      lines.push(`• ${parts.join(', ')}`);
    });
  }

  const plan = ctx.plan;
  if (plan) {
    const planLines: string[] = [];
    if (plan.intent) {
      const intentLabel = plan.intent.replace(/_/g, ' ');
      planLines.push(`Intent ${intentLabel}`);
    }
    if (typeof plan.totalSets === 'number' && plan.totalSets > 0) {
      const completed = typeof plan.completedSets === 'number' ? plan.completedSets : 0;
      const remaining = typeof plan.remainingSets === 'number'
        ? plan.remainingSets
        : Math.max(0, plan.totalSets - completed);
      planLines.push(`Sets ${completed}/${plan.totalSets} done (${remaining} remaining)`);
    }
    const lastPlanSet = describePlanSet(plan.last);
    const nextPlanSet = describePlanSet(plan.next);
    if (lastPlanSet) {
      planLines.push(`Last planned set: ${lastPlanSet}`);
    }
    if (nextPlanSet) {
      planLines.push(`Next planned set: ${nextPlanSet}`);
    }
    if (planLines.length > 0) {
      lines.push('');
      lines.push('Session plan:');
      planLines.forEach((line) => lines.push(`• ${line}`));
    }
  }

  // Recent events (less important now that we have session history)
  if (events.length) {
    const eventLines = events
      .slice(-2)
      .map((event) => `• ${event.type}`);
    if (eventLines.length > 0) {
      lines.push('');
      lines.push('Recent events:');
      lines.push(...eventLines);
    }
  }

  const summary = lines.join('\n');
  return summary.length > 800 ? `${summary.slice(0, 800)}…` : summary;
};

const primeGeminiWithContext = (session: ClientSession) => {
  if (!session.geminiWs || session.geminiWs.readyState !== WebSocket.OPEN) return;
  const summary = summariseContext(session.context, session.events);
  if (!summary || summary === session.lastContextSummary) return;
  session.lastContextSummary = summary;
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
    text: `You are Symmetric's AI coach for leg training. Be specific and decisive using the data provided.

Decision guide:
• Readiness ≥80 + fatigue <15% → 3 sets at 75-80%, 8-10 reps, rest 2min
• Readiness 60-79 → 1-2 quality sets at 70%
• Readiness <60 or fatigue >25% → active recovery (light cardio + mobility 20-30min)

Rules:
- Use specific numbers from context (readiness, reps, balance)
- Don't ask questions - make recommendations
- Reference past sessions when available
- Format: [exercise] x [sets] sets of [reps] reps at [load%], rest [time]

Keep responses under 60 words. No medical advice or singing/voice training.`
  }]
};

export function createLiveCoachGateway(port: number) {
  const httpServer = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Coach Milo gateway online\n');
  });
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
          }

          if (message.serverContent?.modelTurn) {
            const turn = message.serverContent.modelTurn;

            if (turn.parts) {
              for (const part of turn.parts) {
                if (part.text) {
                  clientWs.send(JSON.stringify({
                    type: 'final_stt',
                    text: part.text,
                  }));
                  clientWs.send(JSON.stringify({
                    type: 'assistant_text',
                    text: part.text,
                  }));
                }

                if (part.inlineData?.mimeType?.startsWith('audio/pcm')) {
                  console.log('[LiveCoach] Sending audio to client, size:', part.inlineData.data.length);
                  const audioData = Buffer.from(part.inlineData.data, 'base64');
                  clientWs.send(audioData);
                }
              }
            }
          }

          if (message.serverContent?.turnComplete) {
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

      const decodeIfJson = (payload: WebSocket.RawData): string | null => {
        if (typeof payload === 'string') {
          return payload;
        }
        if (!(payload instanceof Buffer)) {
          return null;
        }
        let firstNonWhitespace: number | undefined;
        for (let i = 0; i < payload.length; i += 1) {
          const byte = payload[i];
          if (byte === 9 || byte === 10 || byte === 13 || byte === 32) continue; // whitespace
          firstNonWhitespace = byte;
          break;
        }
        if (firstNonWhitespace === 123 || firstNonWhitespace === 91) { // "{" or "["
          return payload.toString('utf8');
        }
        return null;
      };

      const maybeJson = decodeIfJson(data);
      if (maybeJson) {
        const trimmed = maybeJson.trimStart();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            const message = JSON.parse(maybeJson);
            console.log('[LiveCoach] Client message:', message.type);

            switch (message.type) {
              case 'context_update':
                updateSessionContext(session, message.context, message.events);
                primeGeminiWithContext(session);
                return;
              case 'ptt_start':
                updateSessionContext(session, message.context, message.events);
                primeGeminiWithContext(session);
                console.log('[LiveCoach] PTT started, ready for audio');
                return;
              case 'audio_end':
                console.log('[LiveCoach] Audio stream ended, waiting for Gemini response');
                return;
              case 'barge_in':
                session.geminiWs.send(JSON.stringify({
                  clientContent: {
                    turnComplete: true
                  }
                }));
                return;
              case 'user_turn':
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
                return;
              default:
                break;
            }
          } catch (err) {
            console.warn('[LiveCoach] Failed to parse client JSON message:', err);
          }
        }
      }

      if (data instanceof Buffer && data.length >= 500) {
        console.log('[LiveCoach] Sending audio chunk to Gemini, size:', data.length);
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

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`[LiveCoach] Server listening on :${port}`);
  });

  return { server: httpServer, wss };
}

// Start server if run directly
const port = Number(process.env.PORT ?? process.env.COACH_WS_PORT ?? 8787);
createLiveCoachGateway(port);
