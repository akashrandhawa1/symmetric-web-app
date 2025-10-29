import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: false });
dotenv.config({ override: false });
import { createServer } from 'http';
import type { IncomingMessage } from 'http';
import { WebSocketServer, type WebSocket } from 'ws';
import { getAI } from '../lib/geminiClient';
import { coachTextReply } from '../lib/coachModel';
import { connectGeminiLive } from '../lib/geminiLiveAdapter';
import { assertGenAISurface } from '../guards/assertGenAISurface';

(() => {
  try {
    assertGenAISurface();
  } catch (error: any) {
    if (error?.message?.includes('GEMINI_API_KEY is missing')) {
      console.warn('[CoachGateway] GEMINI_API_KEY missing; falling back to stubbed coach adapter.');
    } else {
      throw error;
    }
  }
})();

type Persona = 'coach' | 'trainer';

type CoachEventRecord = Record<string, unknown>;

type GeminiStream = {
  persona: Persona;
  voiceId?: string;
  context: Record<string, unknown>;
  events: CoachEventRecord[];
  live?: WebSocket;
  audioFrames: Buffer[];
  send: (message: unknown) => void;
};

type GeminiAdapter = {
  startTurn: (opts: {
    persona: Persona;
    voiceId?: string;
    context: Record<string, unknown>;
    events: CoachEventRecord[];
    send: (message: unknown) => void;
  }) => Promise<GeminiStream | null>;
  pushAudio: (stream: GeminiStream, pcm16: Buffer) => void;
  endAudio: (stream: GeminiStream) => void;
  cancel: (stream: GeminiStream) => void;
  handleTextTurn: (stream: GeminiStream, text: string) => void;
};

export function createCoachGateway(options: {
  port: number;
  adapter: GeminiAdapter;
  authenticate: (req: IncomingMessage) => Promise<boolean>;
}) {
  const { port, adapter, authenticate } = options;
  const httpServer = createServer();
  const wss = new WebSocketServer({ server: httpServer });
  // prevent unhandled 'error' events from bubbling to process
  wss.on('error', (error) => {
    console.warn('[CoachGateway] websocket server error:', error);
  });

  wss.on('connection', async (socket, request) => {
    if (!(await authenticate(request))) {
      socket.close(4403, 'Unauthorized');
      return;
    }

    const ctx: { stream: GeminiStream | null; persona: Persona; voiceId?: string } = {
      stream: null,
      persona: 'coach',
    };

    socket.on('message', async (data) => {
      console.log('[CoachGateway] received data type:', typeof data, data instanceof Buffer ? 'Buffer' : 'String');

      if (typeof data === 'string') {
        const message = safeParse(data);
        if (!message) return;
        console.log('[CoachGateway] received message:', message.type);
        await handleJsonMessage(socket, message, ctx, adapter);
      } else if (data instanceof Buffer) {
        // Try to parse as JSON first (small buffers are likely JSON messages)
        if (data.length < 1000) {
          try {
            const text = data.toString('utf8');
            const message = JSON.parse(text);
            console.log('[CoachGateway] received message (from buffer):', message.type);
            await handleJsonMessage(socket, message, ctx, adapter);
            return;
          } catch {
            // Not JSON, treat as audio
          }
        }

        // Audio buffer
        console.log('[CoachGateway] received audio buffer, size:', data.length);
        if (ctx.stream) {
          adapter.pushAudio(ctx.stream, data);
        }
      }
    });

    socket.on('close', () => {
      if (ctx.stream) {
        adapter.cancel(ctx.stream);
        ctx.stream = null;
      }
    });

    // eslint-disable-next-line no-console
    console.log('[CoachGateway] client connected', request.socket.remoteAddress);
  });

  return { server: httpServer, wss };
}

async function handleJsonMessage(
  socket: WebSocket,
  message: any,
  ctx: { stream: GeminiStream | null; persona: Persona; voiceId?: string },
  adapter: GeminiAdapter,
) {
  switch (message.type) {
    case 'ptt_start': {
      if (ctx.stream) {
        adapter.cancel(ctx.stream);
      }
      ctx.persona = message.persona ?? 'coach';
      ctx.voiceId = message.voiceId;
      ctx.stream = await adapter.startTurn({
        persona: ctx.persona,
        voiceId: ctx.voiceId,
        context: message.ctx ?? {},
        events: message.events ?? [],
        send: (payload) => socket.send(JSON.stringify(payload)),
      });
      if (ctx.stream) {
        socket.send(JSON.stringify({ type: 'ready' }));
      } else {
        socket.send(
          JSON.stringify({
            type: 'error',
            code: 'adapter_unavailable',
            message: 'Voice coach adapter is unavailable.',
          }),
        );
      }
      break;
    }
    case 'audio_end': {
      if (ctx.stream) {
        adapter.endAudio(ctx.stream);
      }
      break;
    }
    case 'user_turn': {
      if (ctx.stream) {
        adapter.cancel(ctx.stream);
      }
      ctx.persona = message.persona ?? ctx.persona;
      ctx.voiceId = message.voiceId ?? ctx.voiceId;
      ctx.stream = await adapter.startTurn({
        persona: ctx.persona,
        voiceId: ctx.voiceId,
        context: message.ctx ?? {},
        events: message.events ?? [],
        send: (payload) => socket.send(JSON.stringify(payload)),
      });
      if (ctx.stream) {
        socket.send(JSON.stringify({ type: 'assistant_ack' }));
        adapter.handleTextTurn(ctx.stream, String(message.text ?? '').trim());
      } else {
        socket.send(
          JSON.stringify({
            type: 'error',
            code: 'adapter_unavailable',
            message: 'Voice coach adapter is unavailable.',
          }),
        );
      }
      break;
    }
    case 'barge_in': {
      if (ctx.stream) {
        adapter.cancel(ctx.stream);
        ctx.stream = null;
      }
      socket.send(JSON.stringify({ type: 'stop_audio' }));
      break;
    }
    default:
      break;
  }
}

function safeParse(payload: string) {
  try {
    return JSON.parse(payload);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[CoachGateway] failed to parse', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Gemini-backed adapter
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are the user's consistent training coach.
Reply with 1–2 short sentences for quick tips; up to ~6 short lines when a plan is requested.
Be concrete, plain English, sport-science lite. If key data is missing, ask one brief clarifying question.
No medical diagnosis or injury treatment. Offer safe alternatives when needed.
Always return pure JSON: {"transcript": string, "response": string}.`;

const PERSONA_INSTRUCTIONS: Record<Persona, string> = {
  coach: 'Tone: encouraging and concise. Avoid lists unless asked.',
  trainer: 'Tone: prescriptive. Prefer "Plan:" and "Do this next: …". Include sets/reps/rest when relevant.',
};

type GeminiCoachAdapterConfig = {
  textModel?: 'gemini-2.5-flash' | 'gemini-2.5-pro';
};

export class GeminiCoachAdapter implements GeminiAdapter {
  private apiKey: string;
  private textModel: 'gemini-2.5-flash' | 'gemini-2.5-pro';

  constructor(config: GeminiCoachAdapterConfig = {}) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY not set for GeminiCoachAdapter.');
    }
    this.apiKey = key;
    this.textModel = config.textModel ?? 'gemini-2.5-flash';
  }

  async startTurn(opts: {
    persona: Persona;
    voiceId?: string;
    context: Record<string, unknown>;
    events: CoachEventRecord[];
    send: (message: unknown) => void;
  }): Promise<GeminiStream | null> {
    const live = connectGeminiLive(this.apiKey);
    const stream: GeminiStream = {
      persona: opts.persona,
      voiceId: opts.voiceId,
      context: opts.context,
      events: opts.events,
      live,
      audioFrames: [],
      send: opts.send,
    };

    live.on('open', () => {
      console.log('[GeminiLive] connected');
      live.send(JSON.stringify(this.buildSetupPayload(stream)));
    });
    live.on('message', (data) => {
      console.log('[GeminiLive] message:', typeof data, data instanceof Buffer ? `Buffer(${(data as Buffer).length})` : data);
      this.forwardLiveMessage(stream, data);
    });
    live.on('error', (error) => {
      console.error('[GeminiLive] socket error:', error);
      stream.send({ type: 'error', code: 'live_error', message: String(error) });
    });
    live.on('close', (code, reason) => {
      const reasonText =
        typeof reason === 'string'
          ? reason
          : reason instanceof Buffer
          ? reason.toString('utf8')
          : undefined;
      console.warn('[GeminiLive] closed', { code, reason: reasonText });
      stream.send({
        type: 'error',
        code: 'live_closed',
        message: reasonText,
      });
    });

    return stream;
  }

  pushAudio(stream: GeminiStream, pcm16: Buffer): void {
    const live = stream.live;
    if (!live || live.readyState !== WebSocket.OPEN) return;
    const audio = Buffer.isBuffer(pcm16) ? pcm16 : Buffer.from(pcm16);
    stream.audioFrames.push(audio);
    live.send(
      JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: audio.toString('base64'),
      }),
    );
  }

  endAudio(stream: GeminiStream): void {
    const live = stream.live;
    if (!live || live.readyState !== WebSocket.OPEN) return;
    live.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    live.send(JSON.stringify({ type: 'response.create' }));
  }

  async handleTextTurn(stream: GeminiStream, text: string): Promise<void> {
    const trimmed = String(text ?? '').trim();
    if (!trimmed) return;
    stream.send({ type: 'final_stt', text: trimmed });
    try {
      const reply = await coachTextReply(trimmed, {
        model: this.textModel === 'gemini-2.5-pro' ? 'pro' : 'flash',
      });
      if (reply) {
        stream.send({ type: 'assistant_text', chunk: reply });
      }
      stream.send({ type: 'assistant_end' });
    } catch (error: any) {
      stream.send({
        type: 'error',
        code: 'gemini_error',
        message: typeof error?.message === 'string' ? error.message : 'Gemini request failed. Please try again.',
      });
    }
  }

  cancel(stream: GeminiStream): void {
    const live = stream.live;
    if (live && live.readyState === WebSocket.OPEN) {
      live.send(JSON.stringify({ type: 'response.cancel' }));
      live.close();
    }
    stream.audioFrames = [];
  }

  private buildSetupPayload(stream: GeminiStream) {
    const personaPrompt = PERSONA_INSTRUCTIONS[stream.persona] ?? PERSONA_INSTRUCTIONS.coach;
    return {
      setup: {
        systemInstruction: [
          SYSTEM_PROMPT,
          personaPrompt,
        ].join('\n'),
        context: {
          coachContext: stream.context,
          recentEvents: stream.events,
        },
        modalities: { input: ['audio'], output: ['text'] },
      },
    };
  }

  private forwardLiveMessage(stream: GeminiStream, data: WebSocket.RawData) {
    const payloadStr = typeof data === 'string' ? data : data.toString();
    try {
      const payload = JSON.parse(payloadStr);
      switch (payload.type) {
        case 'input.audio_transcription.delta':
          if (typeof payload.text === 'string') {
            stream.send({ type: 'interim_stt', text: payload.text });
            return;
          }
          break;
        case 'input.audio_transcription.final':
          if (typeof payload.text === 'string') {
            stream.send({ type: 'final_stt', text: payload.text });
            return;
          }
          break;
        case 'response.output_text.delta':
          if (typeof payload.text === 'string') {
            stream.send({ type: 'assistant_text', chunk: payload.text });
            return;
          }
          break;
        case 'response.output_text.done':
          stream.send({ type: 'assistant_end' });
          return;
        case 'response.error':
          stream.send({
            type: 'error',
            code: payload.code ?? 'live_error',
            message: typeof payload.message === 'string' ? payload.message : 'Gemini Live error',
          });
          return;
        default:
          break;
      }
      stream.send(payload);
    } catch {
      stream.send({ type: 'live_raw', data: payloadStr });
    }
  }
}

// ---------------------------------------------------------------------------
// Development stub adapter
// ---------------------------------------------------------------------------

export class GeminiAdapterStub implements GeminiAdapter {
  async startTurn(opts: {
    persona: Persona;
    voiceId?: string;
    context: Record<string, unknown>;
    events: CoachEventRecord[];
    send: (message: unknown) => void;
  }): Promise<GeminiStream | null> {
    return {
      persona: opts.persona,
      voiceId: opts.voiceId,
      context: opts.context,
      events: opts.events,
      send: opts.send,
    };
  }

  pushAudio(): void {
    // no-op in stub
  }

  endAudio(stream: GeminiStream): void {
    stream.send({ type: 'final_stt', text: '(stub) audio received.' });
    stream.send({
      type: 'assistant_text',
      chunk: 'This is a stubbed response. Configure GeminiCoachAdapter with an API key for live coaching.',
    });
    stream.send({ type: 'assistant_end' });
  }

  handleTextTurn(stream: GeminiStream, text: string): void {
    stream.send({ type: 'final_stt', text });
    stream.send({
      type: 'assistant_text',
      chunk: 'This is a stubbed response. Configure GeminiCoachAdapter with an API key for live coaching.',
    });
    stream.send({ type: 'assistant_end' });
  }

  cancel(stream: GeminiStream): void {
    if (stream.live && stream.live.readyState === WebSocket.OPEN) {
      stream.live.close();
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point (when run via `npx tsx server/ws/index.ts`)
// ---------------------------------------------------------------------------

const shouldBootstrap =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  process.argv[1].endsWith('server/ws/index.ts');

async function startGateway() {
  const basePort = Number(process.env.COACH_WS_PORT ?? 8787);
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
  const adapter = hasApiKey ? new GeminiCoachAdapter() : new GeminiAdapterStub();

  const maxAttempts = process.env.COACH_WS_PORT ? 1 : 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const port = basePort + attempt;
    const gateway = createCoachGateway({
      port,
      adapter,
      authenticate: async () => true,
    });

    const server = gateway.server;
    const wss = gateway.wss;

    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: NodeJS.ErrnoException) => {
          server.off('listening', onListening);
          reject(error);
        };
        const onListening = () => {
          server.off('error', onError);
          resolve();
        };

        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port);
      });

      // eslint-disable-next-line no-console
      console.log(`[CoachGateway] listening on :${port} ${hasApiKey ? '(Gemini connected)' : '(stub mode – GEMINI_API_KEY missing)'}`);
      return;
    } catch (error: any) {
      wss.close();
      server.close();
      if (error?.code === 'EADDRINUSE') {
        if (process.env.COACH_WS_PORT) {
          console.error(`Port ${port} is already in use. Stop the existing process or set COACH_WS_PORT to a free port.`);
          break;
        }
        console.warn(`[CoachGateway] port ${port} in use, trying ${port + 1}…`);
      } else {
        console.error('[CoachGateway] Failed to start gateway:', error);
        break;
      }
    }
  }
}

if (shouldBootstrap) {
  startGateway().catch((error) => {
    console.error('[CoachGateway] Fatal error starting gateway:', error);
    process.exit(1);
  });
}
