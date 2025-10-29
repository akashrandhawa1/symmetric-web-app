import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CoachContextBus, type CoachContext, type CoachEvent } from './CoachContextBus';
import { COACH_PERSONA } from '../lib/coach/constants';
import { buildCoachUserPrompt, containsVocalDrift } from '../lib/coach/buildCoachPrompt';
import { sendCoachText } from '../lib/coach/sendCoachText';
import type { CoachGate } from '../hooks/useCoachGate';

export type VoiceCoachState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
export type Persona = 'coach' | 'trainer';

type AudioPipeline = {
  context: AudioContext;
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  node: AudioWorkletNode | ScriptProcessorNode;
};

type PendingPlayback = {
  when: number;
};

type UseVoiceCoachOptions = {
  wsUrl?: string;
  getAuthToken: () => Promise<string>;
  getContext: () => CoachContext;
  persona: Persona;
  voiceId?: string;
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onAssistantChunk?: (text: string) => void;
  gate?: CoachGate;
};

const COACH_DISABLED_MESSAGE = 'Voice coach is disabled in this environment.';
const COACH_DISABLED_ERROR = new Error(COACH_DISABLED_MESSAGE);

const gateBlockedMessage = (gate?: CoachGate) => {
  if (!gate) return 'Voice coach isn’t available right now.';
  if (gate.reason === 'active_set') return 'Finish the set — I’ll jump in during rest.';
  return 'Voice coach is available from the rest screen.';
};

const coerceBoolean = (value: unknown): boolean | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return undefined;
    if (['1', 'true', 'yes', 'on'].includes(trimmed)) return true;
    if (['0', 'false', 'no', 'off'].includes(trimmed)) return false;
    return Boolean(trimmed);
  }
  return Boolean(value);
};

const resolveCoachApiEnabledFlag = (): boolean => {
  if (typeof globalThis !== 'undefined') {
    const runtimeFlag = (globalThis as any).__ENABLE_COACH_API__;
    const coerced = coerceBoolean(runtimeFlag);
    if (coerced !== undefined) return coerced;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const envCoerced = coerceBoolean((import.meta as any).env?.VITE_ENABLE_COACH_API);
    if (envCoerced !== undefined) return envCoerced;
  }
  if (typeof process !== 'undefined' && process?.env) {
    const procCoerced = coerceBoolean(
      process.env.VITE_ENABLE_COACH_API ?? process.env.ENABLE_COACH_API ?? process.env.COACH_API_ENABLED,
    );
    if (procCoerced !== undefined) return procCoerced;
  }
  return false;
};

const resolveForceLocalCoachFlag = (): boolean => {
  if (typeof globalThis !== 'undefined') {
    const runtimeFlag = (globalThis as any).__COACH_FORCE_LOCAL__;
    const coerced = coerceBoolean(runtimeFlag);
    if (coerced !== undefined) return coerced;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const envCoerced = coerceBoolean((import.meta as any).env?.VITE_COACH_FORCE_LOCAL);
    if (envCoerced !== undefined) return envCoerced;
  }
  if (typeof process !== 'undefined' && process?.env) {
    const procCoerced = coerceBoolean(
      process.env.VITE_COACH_FORCE_LOCAL ?? process.env.COACH_FORCE_LOCAL ?? process.env.FORCE_LOCAL_COACH,
    );
    if (procCoerced !== undefined) return procCoerced;
  }
  return false;
};

const getSpeechRecognitionConstructor = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
};

export function useVoiceCoach(opts: UseVoiceCoachOptions) {
  const {
    wsUrl,
    getAuthToken,
    getContext,
    persona,
    voiceId: voiceIdProp,
    onInterim,
    onFinal,
    onAssistantChunk,
    gate,
  } = opts;

  const initialForceLocal = resolveForceLocalCoachFlag();
  const initialGate = gate ?? { canOpen: true, trigger: 'mic' as const };
  const initialEnabled = initialForceLocal ? false : resolveCoachApiEnabledFlag();
  const initialState: VoiceCoachState = initialForceLocal || (initialGate.canOpen && initialEnabled) ? 'idle' : 'error';
  const initialError = initialForceLocal
    ? undefined
    : !initialGate.canOpen
      ? gateBlockedMessage(initialGate)
      : initialEnabled
        ? undefined
        : COACH_DISABLED_MESSAGE;

  const [state, setState] = useState<VoiceCoachState>(initialState);
  const stateRef = useRef<VoiceCoachState>(initialState);
  const [error, setError] = useState<string | undefined>(initialError);
  const [speaking, setSpeaking] = useState(false);
  const [voiceId, setVoiceIdState] = useState<string | undefined>(voiceIdProp);
  const voiceIdRef = useRef<string | undefined>(voiceIdProp);
  const [inputActive, setInputActive] = useState(false);
  const inputActiveRef = useRef(false);
  const inputInactiveTimeoutRef = useRef<number | null>(null);
  const [micPermissionState, setMicPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');

  const wsRef = useRef<WebSocket | null>(null);
  const wsReadyRef = useRef(false);
  const awaitingFinalRef = useRef(false);
  const audioPipelineRef = useRef<AudioPipeline | null>(null);
  const pendingPlaybackRef = useRef<PendingPlayback | null>(null);
  const sttBufferRef = useRef<string>('');
  const assistantBufferRef = useRef<string>('');
  const personaRef = useRef<Persona>(persona);
  const coachEnabledRef = useRef<boolean>(!initialForceLocal && initialGate.canOpen && initialEnabled);
  const localModeRef = useRef(initialForceLocal);
  const gateRef = useRef<CoachGate>(initialGate);
  const speechRecognitionRef = useRef<any>(null);
  const recognitionSnapshotRef = useRef<{ ctx: CoachContext; events: CoachEvent[] } | null>(null);
  const recognitionFinalRef = useRef<string>('');
  const remoteErrorLoggedRef = useRef(false);

  const ensureGateOpen = useCallback(() => {
    const currentGate = gateRef.current;
    if (currentGate && !currentGate.canOpen) {
      const message = gateBlockedMessage(currentGate);
      setError(message);
      setState('error');
      return false;
    }
    return true;
  }, []);

  const cancelPlayback = useCallback(() => {
    speechSynthesis.cancel();
    pendingPlaybackRef.current = null;
  }, []);

  const activateLocalMode = useCallback(
    (reason?: string) => {
      if (localModeRef.current) {
        if (reason) {
          setError((prev) => prev ?? reason);
        }
        return;
      }
      localModeRef.current = true;
      setSpeaking(false);
      setState('idle');
      if (reason) {
        setError(reason);
        if (typeof window !== 'undefined') {
          window.setTimeout(() => {
            setError((prev) => (prev === reason ? undefined : prev));
          }, 4000);
        }
      } else {
        setError(undefined);
      }
      cancelPlayback();
    },
    [cancelPlayback],
  );

  // keep persona/voice in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    personaRef.current = persona;
  }, [persona]);

  useEffect(() => {
    voiceIdRef.current = voiceIdProp;
    if (voiceIdProp) {
      setVoiceIdState(voiceIdProp);
    }
  }, [voiceIdProp]);

  useEffect(() => {
    const reconcileCoachFlag = () => {
      const enabled = resolveCoachApiEnabledFlag();
      coachEnabledRef.current = enabled;
      if (enabled) {
        if (stateRef.current === 'error' && error === COACH_DISABLED_MESSAGE) {
          stateRef.current = 'idle';
          setState('idle');
          setError(undefined);
        }
      } else if (stateRef.current !== 'error') {
        stateRef.current = 'error';
        setState('error');
        setError(COACH_DISABLED_MESSAGE);
      }
    };

    reconcileCoachFlag();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', reconcileCoachFlag);
      return () => {
        window.removeEventListener('focus', reconcileCoachFlag);
      };
    }
    return () => {};
  }, [error]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;
    let cancelled = false;
    const track = async () => {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (!cancelled) {
          setMicPermissionState(status.state as 'granted' | 'denied' | 'prompt');
        }
        status.onchange = () => {
          setMicPermissionState(status.state as 'granted' | 'denied' | 'prompt');
        };
      } catch (error) {
        // ignore unsupported browsers
      }
    };
    void track();
    return () => {
      cancelled = true;
    };
  }, []);

  const getSnapshotPayload = useCallback((): { ctx: CoachContext; events: CoachEvent[] } => {
    const allEvents = CoachContextBus.getEvents();
    return {
      ctx: getContext(),
      events: allEvents.slice(-5), // Get last 5 events
    };
  }, [getContext]);

  const ensureWebSocket = useCallback(async () => {
    if (localModeRef.current) {
      return Promise.reject(new Error('Voice coach running in local fallback mode.'));
    }
    const currentGate = gateRef.current;
    if (currentGate && !currentGate.canOpen) {
      const message = gateBlockedMessage(currentGate);
      setError(message);
      setState('error');
      return Promise.reject(new Error('coach_gate_closed'));
    }
    if (wsRef.current && wsReadyRef.current) {
      return wsRef.current;
    }
    const enabled = resolveCoachApiEnabledFlag();
    coachEnabledRef.current = enabled;
    if (!enabled) {
      stateRef.current = 'error';
      setState('error');
      setError(COACH_DISABLED_MESSAGE);
      return Promise.reject(COACH_DISABLED_ERROR);
    }
    const token = await getAuthToken();
    const scheme = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host =
      typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_COACH_WS_HOST
        ? (import.meta as any).env.VITE_COACH_WS_HOST
        : typeof window !== 'undefined'
          ? window.location.host
          : 'localhost:8787';
    const path =
      typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_COACH_WS_PATH
        ? (import.meta as any).env.VITE_COACH_WS_PATH
        : '/coach';
    const baseUrl = `${scheme}://${host}${path}`;
    const targetUrl = wsUrl ?? baseUrl;
    const parsed = new URL(targetUrl, typeof window !== 'undefined' ? window.location.href : undefined);
    if (token) {
      parsed.searchParams.set('auth', token);
    }
    return new Promise<WebSocket>((resolve, reject) => {
      let attempt = 0;
      const connect = () => {
        attempt += 1;
        try {
          const socket = new WebSocket(parsed.toString());
          socket.binaryType = 'arraybuffer';
          socket.addEventListener('open', () => {
            wsRef.current = socket;
            wsReadyRef.current = true;
            resolve(socket);
          });
          socket.addEventListener('error', () => {
            if (!remoteErrorLoggedRef.current) {
              remoteErrorLoggedRef.current = true;
              console.info('[VoiceCoach] Remote coach service unavailable, switching to local handling.');
            }
          });
          socket.addEventListener('close', () => {
            wsReadyRef.current = false;
            wsRef.current = null;
            if (gateRef.current?.canOpen && attempt < 5) {
              const backoff = Math.min(10000, 500 * Math.pow(2, attempt));
              window.setTimeout(connect, backoff);
            } else {
              activateLocalMode('Remote coach service unavailable. Switching to local voice coach.');
              reject(new Error('WebSocket closed'));
            }
          });
          socket.addEventListener('message', (evt) => {
            if (typeof evt.data === 'string') {
              handleServerMessage(JSON.parse(evt.data));
            } else if (evt.data instanceof ArrayBuffer) {
              playServerPcm16(evt.data);
            }
          });
        } catch (err) {
          activateLocalMode('Remote coach service unavailable. Switching to local voice coach.');
          reject(err);
        }
      }
      connect();
    });
  }, [activateLocalMode, ensureGateOpen, getAuthToken, wsUrl]);

  const sendJson = useCallback(async (payload: Record<string, unknown>) => {
    if (localModeRef.current) {
      return;
    }
    if (!ensureGateOpen()) {
      throw new Error('coach_gate_closed');
    }
    const enabled = resolveCoachApiEnabledFlag();
    coachEnabledRef.current = enabled;
    if (!enabled) {
      throw COACH_DISABLED_ERROR;
    }
    const socket = await ensureWebSocket();
    console.log('[VoiceCoach] Sending JSON:', payload.type);
    socket.send(JSON.stringify(payload));
  }, [ensureWebSocket, ensureGateOpen]);

  const postAudioFrame = useCallback(
    async (frame: ArrayBuffer) => {
      if (localModeRef.current) {
        return;
      }
      const socket = await ensureWebSocket();
      socket.send(frame);
    },
    [ensureWebSocket],
  );

  const updateInputActivity = useCallback((samples: Int16Array) => {
    if (!samples.length) return;
    let sum = 0;
    for (let i = 0; i < samples.length; i += 1) {
      sum += Math.abs(samples[i]);
    }
    const normalized = sum / (samples.length * 32768);
    const threshold = 0.01;

    if (normalized > threshold) {
      if (typeof window !== 'undefined' && inputInactiveTimeoutRef.current != null) {
        window.clearTimeout(inputInactiveTimeoutRef.current);
        inputInactiveTimeoutRef.current = null;
      }
      if (!inputActiveRef.current) {
        inputActiveRef.current = true;
        setInputActive(true);
      }
    } else if (typeof window !== 'undefined' && inputInactiveTimeoutRef.current == null) {
      inputInactiveTimeoutRef.current = window.setTimeout(() => {
        inputActiveRef.current = false;
        setInputActive(false);
        inputInactiveTimeoutRef.current = null;
      }, 180);
    }
  }, []);

  const handleServerMessage = useCallback(
    (msg: any) => {
      switch (msg.type) {
        case 'interim_stt':
          sttBufferRef.current = msg.text ?? '';
          onInterim?.(sttBufferRef.current);
          break;
        case 'final_stt':
          awaitingFinalRef.current = false;
          sttBufferRef.current = msg.text ?? '';
          onFinal?.(sttBufferRef.current);
          setState('thinking');
          break;
        case 'assistant_text':
          assistantBufferRef.current += msg.chunk ?? '';
          onAssistantChunk?.(msg.chunk ?? '');
          break;
        case 'assistant_end': {
          const trimmed = assistantBufferRef.current.trim();
          const useLocalSpeech = localModeRef.current || Boolean(msg?.forceLocal);
          if (!msg.audio && trimmed.length > 0) {
            if (useLocalSpeech) {
              setState('speaking');
              speakClientTTS(trimmed);
            } else {
              setSpeaking(false);
              setState('idle');
            }
          }
          assistantBufferRef.current = '';
          break;
        }
        case 'assistant_audio':
          localModeRef.current = false;
          setError(undefined);
          setState('speaking');
          playServerPcm16(msg.pcm16);
          break;
        case 'assistant_audio_end':
          setSpeaking(false);
          setState('idle');
          break;
        case 'stop_audio':
          cancelPlayback();
          setSpeaking(false);
          break;
        case 'error':
          setError(msg.message ?? 'Coach service error.');
          setState('error');
          break;
        default:
          break;
      }
    },
    [cancelPlayback, onAssistantChunk, onFinal, onInterim],
  );

  const speakClientTTS = useCallback(
    (text: string) => {
      if (!text) {
        setState('idle');
        return;
      }
      if (typeof window === 'undefined' || typeof speechSynthesis === 'undefined') {
        setState('idle');
        return;
      }
      cancelPlayback();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices();
      const targetVoiceId = voiceIdRef.current;
      if (targetVoiceId) {
        const voice = voices.find((v) => v.name === targetVoiceId);
        if (voice) {
          utterance.voice = voice;
        }
      }
      utterance.onstart = () => {
        setSpeaking(true);
      };
      utterance.onend = () => {
        setSpeaking(false);
        setState('idle');
      };
      speechSynthesis.speak(utterance);
    },
    [cancelPlayback],
  );

  const deliverAssistantResponse = useCallback(
    (text: string) => {
      const trimmed = typeof text === 'string' ? text.trim() : '';
      if (!trimmed) {
        setState('idle');
        return;
      }
      handleServerMessage({ type: 'assistant_text', chunk: trimmed });
      handleServerMessage({ type: 'assistant_end', audio: false });
    },
    [handleServerMessage],
  );

  const composeOfflineCoachReply = useCallback(
    (userText: string, snapshot: { ctx: CoachContext; events: CoachEvent[] }): string => {
      const trimmed = userText.trim();
      const { ctx } = snapshot;
      const readinessValue = Number.isFinite(ctx.readiness) ? Math.round(ctx.readiness) : null;

      let readinessLine: string;
      if (readinessValue != null) {
        if (readinessValue >= 80) {
          readinessLine = `You're running hot at ${readinessValue} readiness—perfect window for confident work.`;
        } else if (readinessValue >= 60) {
          readinessLine = `Readiness is steady around ${readinessValue}; keep pushing but guard tempo and breathing.`;
        } else if (readinessValue >= 45) {
          readinessLine = `Readiness is moderate at ${readinessValue}, so stay technical and listen for fatigue cues.`;
        } else {
          readinessLine = `Readiness is ${readinessValue}; protect quality and lean into recovery-friendly choices.`;
        }
      } else {
        readinessLine = 'Let’s keep the session intentional and meet the work with whatever energy you have.';
      }

      let phaseCue: string;
      switch (ctx.sessionPhase) {
        case 'intro':
        case 'warmup':
          phaseCue = 'Use these minutes to groove posture and long nasal exhales.';
          break;
        case 'work':
          phaseCue = 'Own the next block—smooth tempo, full range, controlled breathe out on effort.';
          break;
        case 'rest':
          phaseCue = 'Shake tension out, breathe slow through the nose, and get the next set in your head.';
          break;
        case 'cooldown':
          phaseCue = 'Ease the intensity, stretch what feels sticky, and finish with long exhales.';
          break;
        case 'summary':
          phaseCue = 'Log how the block felt so we can adjust the next run.';
          break;
        default:
          phaseCue = 'Keep every rep deliberate—quality beats quantity right now.';
          break;
      }

      const wantsRest = /rest|break|recover|recovery|tired|fatigue/i.test(trimmed);
      const tiredFlag = !!ctx.userFlags?.tired;
      const painFlag = !!ctx.userFlags?.pain;
      const symmetry = typeof ctx.metrics?.symmetryPct === 'number' ? Math.round(ctx.metrics!.symmetryPct) : null;
      const drop = typeof ctx.metrics?.rmsDropPct === 'number' ? Math.round(ctx.metrics!.rmsDropPct) : null;

      const actionHints: string[] = [];
      if (painFlag) {
        actionHints.push('Dial the load back and keep the range pain-free until things calm down.');
      }
      if (symmetry != null && symmetry < 88) {
        actionHints.push('Lead with the weaker side and chase even pressure through the next set.');
      }
      if (drop != null && drop > 25) {
        actionHints.push('Cap the next set once drive slips again—quality beats volume tonight.');
      }
      if (wantsRest || tiredFlag || (readinessValue != null && readinessValue < 45)) {
        actionHints.push('Give yourself 60–90 seconds of slow breathing or wrap the block for recovery.');
      }
      if (!actionHints.length) {
        if (ctx.lastSet?.exercise) {
          actionHints.push(`Go back in on ${ctx.lastSet.exercise} with crisp tempo and shut it down if form leaks.`);
        } else {
          actionHints.push('Hit the next set smooth and focused; stop as soon as the quality slips.');
        }
      }

      const reply = [readinessLine, phaseCue, actionHints[0]].filter(Boolean).join(' ');
      return reply || 'Keep it deliberate—smooth reps, long exhales, and stop once quality fades.';
    },
    [],
  );

  const generateLocalCoachResponse = useCallback(
    async (userText: string, snapshot: { ctx: CoachContext; events: CoachEvent[] }): Promise<string> => {
      const trimmed = userText.trim();
      const fallback = composeOfflineCoachReply(trimmed, snapshot);

      try {
        const { ctx, events } = snapshot;
        const metrics = ctx.metrics ?? {};
        const readiness = Math.round(ctx.readiness ?? 0);
        const mapPhase = (phase: CoachContext['sessionPhase']): 'rest' | 'active' | 'idle' => {
          switch (phase) {
            case 'rest':
              return 'rest';
            case 'summary':
            case 'cooldown':
              return 'idle';
            default:
              return 'active';
          }
        };
        const promptPhase = mapPhase(ctx.sessionPhase);
        const goal = ctx.goal === 'recovery' ? 'recovery' : 'strength';
        const symmetry = typeof metrics.symmetryPct === 'number' ? Math.round(metrics.symmetryPct) : undefined;
        const fatigue = typeof metrics.rmsDropPct === 'number' ? Math.round(metrics.rmsDropPct) : undefined;

        const parts: string[] = [
          `Readiness: ${readiness}.`,
          `Session phase: ${ctx.sessionPhase}. Goal: ${ctx.goal}.`,
        ];
        if (typeof metrics.ror === 'string') {
          parts.push(`Rate of recovery trend: ${metrics.ror}.`);
        }
        if (ctx.lastSet?.exercise) {
          parts.push(
            `Last set: ${ctx.lastSet.exercise} x${ctx.lastSet.reps}${
              ctx.lastSet.rpe != null ? ` @ RPE ${ctx.lastSet.rpe}` : ''
            }`,
          );
        }
        if (ctx.userFlags?.tired) {
          parts.push('Athlete flagged as tired.');
        }
        if (ctx.userFlags?.pain) {
          parts.push('Athlete flagged pain/discomfort.');
        }

        const recentEvents = events
          .slice(-3)
          .map((event) => {
            const payloadSummary = event.payload
              ? ` payload=${JSON.stringify(event.payload).slice(0, 80)}`
              : '';
            return `• ${event.type}${payloadSummary}`;
          })
          .join('\n');

        const recentEventsString = recentEvents.trim().length ? recentEvents : undefined;

        const prompt = buildCoachUserPrompt({
          readiness,
          phase: promptPhase,
          goal,
          symmetryPct: symmetry,
          fatiguePct: fatigue,
          nextExercise: ctx.lastSet?.exercise,
          parts,
          recentEvents: recentEventsString,
          userUtterance: trimmed,
        });

        try {
          let reply = (await sendCoachText(prompt, {
            speaker_style: COACH_PERSONA.speaker_style,
            phase: promptPhase,
            readiness,
          })).trim();
          if (!reply) {
            throw new Error('empty_coach_reply');
          }
          if (containsVocalDrift(reply)) {
            const reminderPrompt = `${prompt}\nReminder: Stay on muscles, sets, load, symmetry, or recovery.`;
            const retry = (await sendCoachText(reminderPrompt, {
              speaker_style: COACH_PERSONA.speaker_style,
              phase: promptPhase,
              readiness,
              reminder: true,
            })).trim();
            if (retry && !containsVocalDrift(retry)) {
              return retry;
            }
            return 'Let’s stay on training—ask me about sets, load, symmetry, or recovery.';
          }
          return reply;
        } catch (error) {
          console.error('[VoiceCoach] Coach text request failed:', error);
        }
      } catch (error) {
        console.error('[VoiceCoach] Local Gemini generation failed:', error);
      }

      return fallback;
    },
    [composeOfflineCoachReply],
  );

  const handleLocalUserTurn = useCallback(
    async (text: string, snapshot: { ctx: CoachContext; events: CoachEvent[] }) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setState('idle');
        return;
      }
      try {
        const reply = await generateLocalCoachResponse(trimmed, snapshot);
        deliverAssistantResponse(reply);
      } catch (error) {
        console.error('[VoiceCoach] Local voice coach error:', error);
        setError(error instanceof Error ? error.message : 'Unable to respond right now.');
        setState('error');
      }
    },
    [deliverAssistantResponse, generateLocalCoachResponse],
  );

  const stopLocalRecognition = useCallback(
    (abort = false) => {
      const recognition = speechRecognitionRef.current;
      if (!recognition) return;
      speechRecognitionRef.current = null;
      try {
        if (abort && typeof recognition.abort === 'function') {
          recognition.abort();
        } else if (typeof recognition.stop === 'function') {
          recognition.stop();
        }
      } catch {
        // ignore stop errors
      }
    },
    [],
  );

  const startLocalRecognition = useCallback(
    (snapshot: { ctx: CoachContext; events: CoachEvent[] }) => {
      const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
      if (!SpeechRecognitionCtor) {
        setError('Browser speech recognition is unavailable.');
        setState('error');
        return;
      }

      recognitionSnapshotRef.current = snapshot;
      recognitionFinalRef.current = '';
      const recognition = new (SpeechRecognitionCtor as any)();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      speechRecognitionRef.current = recognition;

      recognition.onstart = () => {
        awaitingFinalRef.current = true;
        inputActiveRef.current = true;
        setInputActive(true);
        setState('listening');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalText = recognitionFinalRef.current;
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0]?.transcript ?? '';
          if (!transcript) continue;
          if (result.isFinal) {
            finalText = `${finalText} ${transcript}`.trim();
          } else {
            interim += transcript;
          }
        }
        if (interim.trim()) {
          handleServerMessage({ type: 'interim_stt', text: interim.trim() });
        }
        recognitionFinalRef.current = finalText;
      };

      recognition.onerror = (event: any) => {
        console.error('[VoiceCoach] Speech recognition error:', event);
        setError(event?.error ? `Speech recognition error: ${event.error}` : 'Speech recognition error');
        setState('error');
      };

      recognition.onend = async () => {
        speechRecognitionRef.current = null;
        inputActiveRef.current = false;
        setInputActive(false);

        const finalText = recognitionFinalRef.current.trim();
        recognitionFinalRef.current = '';
        const snapshotPayload = recognitionSnapshotRef.current ?? getSnapshotPayload();
        recognitionSnapshotRef.current = null;

        if (!finalText) {
          setState('idle');
          return;
        }

        handleServerMessage({ type: 'final_stt', text: finalText });
        await handleLocalUserTurn(finalText, snapshotPayload);
      };

      try {
        recognition.start();
      } catch (error) {
        console.error('[VoiceCoach] Failed to start speech recognition:', error);
        setError('Unable to start speech recognition.');
        setState('error');
      }
    },
    [getSnapshotPayload, handleLocalUserTurn, handleServerMessage, setError, setState],
  );

  const playServerPcm16 = useCallback((pcm16: ArrayBuffer) => {
    if (!pcm16) return;
    const context = audioPipelineRef.current?.context ?? new AudioContext();
    audioPipelineRef.current = audioPipelineRef.current ?? { context } as AudioPipeline;
    const data = new Int16Array(pcm16);
    const audioBuffer = context.createBuffer(1, data.length, 16000);
    const channel = audioBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      channel[i] = data[i] / 32768;
    }
    const src = context.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(context.destination);
    const startAt = Math.max(context.currentTime, pendingPlaybackRef.current?.when ?? context.currentTime);
    src.start(startAt);
    pendingPlaybackRef.current = { when: startAt + audioBuffer.duration };
    setSpeaking(true);
  }, []);

  const destroyAudioPipeline = useCallback(() => {
    const pipeline = audioPipelineRef.current;
    if (pipeline?.node) {
      pipeline.node.disconnect();
      // ScriptProcessorNode and AudioWorkletNode both expose .port?.close? handle gracefully.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const port = (pipeline.node as any).port;
      if (port && typeof port.close === 'function') {
        port.close();
      }
    }
    pipeline?.source.disconnect();
    pipeline?.context.close().catch(() => {});
    pipeline?.stream.getTracks().forEach((track) => track.stop());
    audioPipelineRef.current = null;
  }, []);

  const buildAudioPipeline = useCallback(async (): Promise<AudioPipeline> => {
    if (audioPipelineRef.current) return audioPipelineRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const supportsWorklet = typeof audioContext.audioWorklet !== 'undefined';
    let node: AudioWorkletNode | ScriptProcessorNode;
    if (supportsWorklet) {
      await audioContext.audioWorklet.addModule(new URL('./AudioWorkletProcessor.js', import.meta.url));
      node = new AudioWorkletNode(audioContext, 'coach-recorder-processor', {
        processorOptions: { targetSampleRate: 16000, frameSize: 640 },
      });
      node.port.onmessage = (event) => {
        const frame = event.data as ArrayBuffer;
        if (frame && stateRef.current === 'listening') {
          updateInputActivity(new Int16Array(frame));
          postAudioFrame(frame);
        }
      };
      source.connect(node);
      node.connect(audioContext.destination);
    } else {
      const scriptNode = audioContext.createScriptProcessor(2048, 1, 1);
      scriptNode.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const downsampled = downsampleFloat32(input, audioContext.sampleRate, 16000);
        if (!downsampled) return;
        if (stateRef.current === 'listening') {
          updateInputActivity(downsampled);
          postAudioFrame(downsampled.buffer.slice(0));
        }
      };
      source.connect(scriptNode);
      scriptNode.connect(audioContext.destination);
      node = scriptNode;
    }
    const pipeline: AudioPipeline = {
      context: audioContext,
      stream,
      source,
      node,
    };
    audioPipelineRef.current = pipeline;
    return pipeline;
  }, [postAudioFrame, updateInputActivity]);

  const startPTT = useCallback(async () => {
    if (state === 'listening') return;
    if (!ensureGateOpen()) {
      return;
    }
    const forceLocal = resolveForceLocalCoachFlag();
    if (localModeRef.current && !forceLocal) {
      localModeRef.current = false;
    }
    const enabled = resolveCoachApiEnabledFlag();
    coachEnabledRef.current = enabled;
    if (!enabled) {
      stateRef.current = 'error';
      setError(COACH_DISABLED_MESSAGE);
      setState('error');
      return;
    }
    if (localModeRef.current) {
      setError(undefined);
      cancelPlayback();
      setSpeaking(false);
      awaitingFinalRef.current = true;
      const snapshot = getSnapshotPayload();
      startLocalRecognition(snapshot);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone not available. Please enable mic permissions.');
      setState('error');
      return;
    }
    try {
      setError(undefined);
      cancelPlayback();
      setSpeaking(false);
      setState('listening');
      awaitingFinalRef.current = true;

      const socket = await ensureWebSocket();
      if (socket.readyState === WebSocket.CONNECTING) {
        await new Promise<void>((resolve) => {
          socket.addEventListener('open', () => resolve(), { once: true });
        });
      }

      const snapshot = getSnapshotPayload();
      await sendJson({
        type: 'ptt_start',
        persona: personaRef.current,
        voiceId: voiceIdRef.current,
        ctx: snapshot.ctx,
        events: snapshot.events,
      });
      await buildAudioPipeline();
    } catch (err: any) {
      if (localModeRef.current) {
        destroyAudioPipeline();
        setError(undefined);
        setState('idle');
        const snapshot = getSnapshotPayload();
        startLocalRecognition(snapshot);
        return;
      }
      console.error('[VoiceCoach] startPTT error:', err);
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'NotFoundError')) {
        setMicPermissionState('denied');
        setError('Microphone access denied. Click "Enable microphone" to grant permission.');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to start recording.');
      }
      setState('error');
      destroyAudioPipeline();
    }
  }, [buildAudioPipeline, cancelPlayback, destroyAudioPipeline, ensureGateOpen, ensureWebSocket, getSnapshotPayload, sendJson, startLocalRecognition, state]);

  const stopPTT = useCallback(async () => {
    if (state !== 'listening') return;
    try {
      if (localModeRef.current) {
        stopLocalRecognition(false);
        return;
      }
      await sendJson({ type: 'audio_end' });
      destroyAudioPipeline();
      if (awaitingFinalRef.current) {
        setState('thinking');
      }
      inputActiveRef.current = false;
      setInputActive(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to stop recording.');
      setState('error');
    }
  }, [destroyAudioPipeline, sendJson, state, stopLocalRecognition]);

  const cancel = useCallback(() => {
    if (localModeRef.current) {
      recognitionSnapshotRef.current = null;
      recognitionFinalRef.current = '';
      stopLocalRecognition(true);
      setState('idle');
      setSpeaking(false);
      inputActiveRef.current = false;
      setInputActive(false);
      return;
    }
    cancelPlayback();
    destroyAudioPipeline();
    sendJson({ type: 'barge_in' }).catch(() => undefined);
    setState('idle');
    setSpeaking(false);
    inputActiveRef.current = false;
    setInputActive(false);
  }, [cancelPlayback, destroyAudioPipeline, sendJson, stopLocalRecognition]);

  useEffect(() => {
    gateRef.current = gate ?? { canOpen: true, trigger: 'mic' };
    if (initialForceLocal) return;
    if (gate && !gate.canOpen) {
      cancel();
      destroyAudioPipeline();
      speechRecognitionRef.current = null;
      inputActiveRef.current = false;
      setInputActive(false);
      setSpeaking(false);
      setState('error');
      setError(gateBlockedMessage(gate));
      coachEnabledRef.current = false;
    } else if (gate?.canOpen) {
      coachEnabledRef.current = resolveCoachApiEnabledFlag();
      if (state === 'error' && error && (error === gateBlockedMessage(gate) || error === COACH_DISABLED_MESSAGE)) {
        setError(undefined);
        setState('idle');
      }
    }
  }, [gate, cancel, destroyAudioPipeline, initialForceLocal, state, error]);

  const requestMicAccess = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setError(undefined);
      setMicPermissionState('granted');
    } catch (err: any) {
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access still blocked. Check your browser settings to allow audio.'
          : err instanceof Error
          ? err.message
          : 'Unable to access microphone.',
      );
      setMicPermissionState('denied');
    }
  }, []);

  const sendTextTurn = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      try {
        if (localModeRef.current && !resolveForceLocalCoachFlag()) {
          localModeRef.current = false;
        }
        if (localModeRef.current) {
          const snapshot = getSnapshotPayload();
          await handleLocalUserTurn(trimmed, snapshot);
          return;
        }
        if (!ensureGateOpen()) {
          throw new Error('coach_gate_closed');
        }
        const enabled = resolveCoachApiEnabledFlag();
        coachEnabledRef.current = enabled;
        if (!enabled) {
          throw COACH_DISABLED_ERROR;
        }
        const snapshot = getSnapshotPayload();
        await sendJson({
          type: 'user_turn',
          persona: personaRef.current,
          voiceId: voiceIdRef.current,
          ctx: snapshot.ctx,
          events: snapshot.events,
          text: trimmed,
        });
        setState('thinking');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to send message.');
        setState('error');
      }
    },
    [getSnapshotPayload, handleLocalUserTurn, ensureGateOpen, sendJson],
  );

  useEffect(() => {
    return () => {
      cancel();
      wsRef.current?.close();
      wsRef.current = null;
      if (typeof window !== 'undefined' && inputInactiveTimeoutRef.current != null) {
        window.clearTimeout(inputInactiveTimeoutRef.current);
        inputInactiveTimeoutRef.current = null;
      }
    };
  }, [cancel]);

  const derivedState = useMemo(
    () => ({
      state,
      error,
      speaking,
      inputActive,
      micPermissionState,
      startPTT,
      stopPTT,
      cancel,
      requestMicAccess,
      sendTextTurn,
      isLocalFallback: localModeRef.current,
      setVoiceId: (voice?: string) => {
        voiceIdRef.current = voice;
        setVoiceIdState(voice);
      },
    }),
    [cancel, error, inputActive, micPermissionState, requestMicAccess, sendTextTurn, speaking, startPTT, state, stopPTT],
  );

  return derivedState;
}

function downsampleFloat32(buffer: Float32Array, inSampleRate: number, outSampleRate: number): Int16Array | null {
  if (outSampleRate === inSampleRate) {
    return floatTo16Bit(buffer);
  }
  if (outSampleRate > inSampleRate) {
    return null;
  }
  const sampleRateRatio = inSampleRate / outSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const output = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < output.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      accum += buffer[i];
      count += 1;
    }
    output[offsetResult] = convertToPcmSample(accum / count);
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }
  return output;
}

function floatTo16Bit(buffer: Float32Array): Int16Array {
  const output = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i += 1) {
    output[i] = convertToPcmSample(buffer[i]);
  }
  return output;
}

function convertToPcmSample(value: number): number {
  const clamped = Math.max(-1, Math.min(1, value));
  return clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
}
