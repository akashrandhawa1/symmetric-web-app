import { useState, useRef, useCallback, useEffect } from 'react';
import { CoachContextBus } from '../coach/CoachContextBus';
import type { CoachContext, CoachEvent } from '../coach/CoachContextBus';

const WS_URL = 'ws://localhost:8889';

type GeminiLiveState = 'disconnected' | 'connecting' | 'connected' | 'error';

type PromptPayload = {
  ctx: CoachContext;
  events: CoachEvent[];
};

const buildPromptPayload = (): PromptPayload => {
  const ctx = CoachContextBus.getSnapshot();
  const events = CoachContextBus.getEvents().slice(-5);
  return { ctx, events };
};

export function useGeminiLive() {
  const [state, setState] = useState<GeminiLiveState>('disconnected');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [stage, setStage] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const playbackTimeRef = useRef<number>(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const silenceFramesRef = useRef(0);
  const autoStopTimeoutRef = useRef<number | null>(null);
  const processingTimeoutRef = useRef<number | null>(null);
  const listenStartRef = useRef<number | null>(null);
  const speechDetectedRef = useRef(false);
  const isListeningRef = useRef(false);

  const SILENCE_THRESHOLD = 0.008;
  const SILENCE_FRAMES_REQUIRED = 5;
  const NO_INPUT_TIMEOUT_MS = 1800;
  const MAX_LISTEN_DURATION_MS = 15000;
  const PROCESSING_TIMEOUT_MS = 8000; // 8 seconds max processing time

  type StopReason = 'manual' | 'silence' | 'timeout' | 'no_input';

  // Play audio from Gemini response
  const playAudioBuffer = async (arrayBuffer: ArrayBuffer) => {
    try {
      if (!audioContextRef.current) {
        // Create audio context matching system sample rate, then resample
        audioContextRef.current = new AudioContext();
        playbackTimeRef.current = 0;
        console.log('[GeminiLive] Created AudioContext, sample rate:', audioContextRef.current.sampleRate);
      }

      console.log('[GeminiLive] Processing audio buffer, size:', arrayBuffer.byteLength, 'bytes');

      // The server sends raw PCM16 data at 24kHz
      const int16Array = new Int16Array(arrayBuffer);
      const float32Array = new Float32Array(int16Array.length);

      // Convert PCM16 to float32 range [-1, 1]
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      console.log('[GeminiLive] Converted', int16Array.length, 'samples to float32');

      // Create audio buffer at 24kHz (Gemini's output rate)
      const audioBuffer = audioContextRef.current.createBuffer(
        1, // mono
        float32Array.length,
        24000 // Gemini outputs 24kHz
      );
      audioBuffer.getChannelData(0).set(float32Array);

      // Play the audio
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      const currentContextTime = audioContextRef.current.currentTime;
      const startAt = playbackTimeRef.current > currentContextTime
        ? playbackTimeRef.current
        : currentContextTime;
      source.start(startAt);
      playbackTimeRef.current = startAt + audioBuffer.duration;

      console.log('[GeminiLive] ✓ Queued audio chunk, duration:', audioBuffer.duration.toFixed(2), 'seconds', 'startAt:', startAt.toFixed(2));
      setStage('speaking');

      source.onended = () => {
        audioQueueRef.current = audioQueueRef.current.filter((node) => node !== source);
        if (audioQueueRef.current.length === 0) {
          playbackTimeRef.current = 0;
          setStage(isListening ? 'listening' : 'idle');
        }
        console.log('[GeminiLive] ✓ Audio chunk finished playing');
      };

      audioQueueRef.current.push(source);
    } catch (error) {
      console.error('[GeminiLive] ✗ Failed to play audio:', error);
    }
  };

  const startListening = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('[GeminiLive] Not connected');
      return;
    }

    if (isListeningRef.current) {
      console.warn('[GeminiLive] Already listening');
      return;
    }

    console.log('[GeminiLive] Starting to listen...');
    setStage('listening');
    setTranscript('');

    silenceFramesRef.current = 0;
    speechDetectedRef.current = false;
    listenStartRef.current = Date.now();
    if (autoStopTimeoutRef.current != null) {
      window.clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      micStreamRef.current = stream;

      const promptPayload = buildPromptPayload();
      wsRef.current.send(JSON.stringify({
        type: 'ptt_start',
        context: promptPayload.ctx,
        events: promptPayload.events,
      }));

      const scheduleAutoStop = (reason: StopReason) => {
        if (autoStopTimeoutRef.current != null) return;
        autoStopTimeoutRef.current = window.setTimeout(() => {
          autoStopTimeoutRef.current = null;
          stopListening({ reason });
        }, 0);
      };

      const audioContext = new AudioContext({ sampleRate: 16000 });
      micAudioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      micSourceRef.current = source;
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      micProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!isListeningRef.current) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < inputData.length; i += 1) {
          sum += Math.abs(inputData[i]);
        }
        const avg = sum / inputData.length;

        if (avg > SILENCE_THRESHOLD) {
          speechDetectedRef.current = true;
          silenceFramesRef.current = 0;
        } else {
          silenceFramesRef.current += 1;
        }

        const started = listenStartRef.current ?? Date.now();
        const elapsed = Date.now() - started;

        if (!speechDetectedRef.current && elapsed > NO_INPUT_TIMEOUT_MS) {
          scheduleAutoStop('no_input');
        } else if (speechDetectedRef.current && silenceFramesRef.current >= SILENCE_FRAMES_REQUIRED) {
          scheduleAutoStop('silence');
        }

        if (elapsed > MAX_LISTEN_DURATION_MS) {
          scheduleAutoStop('timeout');
        }

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const int16Array = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i += 1) {
            int16Array[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          wsRef.current.send(int16Array.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsListening(true);
      isListeningRef.current = true;
    } catch (error) {
      console.error('[GeminiLive] Failed to start listening:', error);
      setStage('idle');
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [setStage, buildPromptPayload]);

  const stopListening = useCallback(({ reason = 'manual' }: { reason?: StopReason } = {}) => {
    if (!isListeningRef.current) {
      if (reason === 'no_input' || reason === 'timeout') {
        setStage('idle');
        setTranscript('');
      }
      return;
    }

    console.log('[GeminiLive] Stopping listening', reason);

    isListeningRef.current = false;
    setIsListening(false);

    if (autoStopTimeoutRef.current != null) {
      window.clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'audio_end' }));
    }

    if (micProcessorRef.current) {
      micProcessorRef.current.disconnect();
      micProcessorRef.current.onaudioprocess = null;
      micProcessorRef.current = null;
    }
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (micAudioContextRef.current) {
      micAudioContextRef.current.close().catch(() => null);
      micAudioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    silenceFramesRef.current = 0;
    listenStartRef.current = null;

    const hadSpeech = speechDetectedRef.current;
    speechDetectedRef.current = false;

    if (!hadSpeech && (reason === 'no_input' || reason === 'timeout')) {
      setTranscript('');
      setStage('idle');
    } else if (!hadSpeech && reason === 'manual') {
      setStage('idle');
    } else {
      setStage('processing');
      // Set timeout for processing - if Gemini doesn't respond in 8s, go back to idle
      processingTimeoutRef.current = window.setTimeout(() => {
        console.log('[GeminiLive] Processing timeout - no response from Gemini');
        setStage('idle');
        setTranscript('');
      }, PROCESSING_TIMEOUT_MS);
    }
  }, [setStage, setTranscript, PROCESSING_TIMEOUT_MS]);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[GeminiLive] Already connected');
      return;
    }

    console.log('[GeminiLive] Connecting to', WS_URL);
    setState('connecting');

    try {
      const initialPrompt = buildPromptPayload();
      const ws = new WebSocket(WS_URL);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[GeminiLive] Connected');
        setState('connected');
        setStage(isListeningRef.current ? 'listening' : 'idle');

        ws.send(JSON.stringify({
          type: 'context_update',
          context: initialPrompt.ctx,
          events: initialPrompt.events,
        }));
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          try {
            const message = JSON.parse(event.data);
            console.log('[GeminiLive] Message:', message.type);
            const listening = isListeningRef.current;

            switch (message.type) {
              case 'ready':
                setStage(listening ? 'listening' : 'idle');
                break;
              case 'final_stt':
                setTranscript(message.text ?? '');
                setStage('processing');
                break;
              case 'assistant_audio_end':
                setStage(listening ? 'listening' : 'idle');
                break;
              case 'error':
                console.error('[GeminiLive] Error:', message.message);
                stopListening({ reason: 'no_input' });
                setState('error');
                setStage('idle');
                break;
              default:
                break;
            }
          } catch (err) {
            console.error('[GeminiLive] Failed to parse message:', err);
          }
        } else if (event.data instanceof ArrayBuffer) {
          // Clear processing timeout since we got a response
          if (processingTimeoutRef.current != null) {
            window.clearTimeout(processingTimeoutRef.current);
            processingTimeoutRef.current = null;
          }
          setStage('speaking');
          await playAudioBuffer(event.data);
        } else if (event.data instanceof Blob) {
          // Clear processing timeout since we got a response
          if (processingTimeoutRef.current != null) {
            window.clearTimeout(processingTimeoutRef.current);
            processingTimeoutRef.current = null;
          }
          setStage('speaking');
          const arrayBuffer = await event.data.arrayBuffer();
          await playAudioBuffer(arrayBuffer);
        }
      };

      ws.onerror = (error) => {
        console.error('[GeminiLive] WebSocket error:', error);
        stopListening({ reason: 'no_input' });
        setState('error');
        setStage('idle');
      };

      ws.onclose = () => {
        console.log('[GeminiLive] Disconnected');
        setState('disconnected');
        stopListening({ reason: 'no_input' });
        setStage('idle');
      };
    } catch (error) {
      console.error('[GeminiLive] Connection failed:', error);
      stopListening({ reason: 'no_input' });
      setState('error');
      setStage('idle');
    }
  }, [playAudioBuffer, stopListening]);

  // Disconnect
  const disconnect = useCallback(() => {
    console.log('[GeminiLive] Disconnecting');
    stopListening({ reason: 'no_input' });

    // Clear processing timeout
    if (processingTimeoutRef.current != null) {
      window.clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioContextRef.current) {
      audioQueueRef.current.forEach((source) => {
        try {
          source.stop();
        } catch {
          // ignore
        }
      });
      audioQueueRef.current = [];
      playbackTimeRef.current = 0;
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setState('disconnected');
    setStage('idle');
  }, [stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    state,
    isListening,
    transcript,
    stage,
    connect,
    disconnect,
    startListening,
    stopListening,
  };
}
