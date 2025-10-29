import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { Mic, X, Send, Loader2 } from 'lucide-react';

type TranscriptEntry = { id: string; role: 'user' | 'coach'; text: string };

type CoachDockProps = {
  open: boolean;
  onClose: () => void;
  onSend: (text: string) => Promise<string>;
};

const getSpeechRecognitionCtor = () => {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
};

const avatarColors = ['bg-emerald-500', 'bg-emerald-400', 'bg-emerald-300'];

export const CoachDock: React.FC<CoachDockProps> = ({ open, onClose, onSend }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const [pending, setPending] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastPreview = useMemo(
    () => messages.filter((m) => m.role === 'coach').slice(-1)[0]?.text ?? '',
    [messages],
  );

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => textareaRef.current?.focus(), 120);
      return () => window.clearTimeout(timer);
    } else {
      // Cancel any ongoing speech when dock closes
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
    return undefined;
  }, [open]);

  const appendMessage = useCallback((entry: TranscriptEntry) => {
    setMessages((prev) => [...prev.slice(-19), entry]);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;
      setPending(true);
      setError(null);
      appendMessage({ id: `user-${Date.now()}`, role: 'user', text: trimmed });
      setInput('');
      try {
        const reply = await onSend(trimmed);
        const replyText = reply.trim();
        appendMessage({ id: `coach-${Date.now()}`, role: 'coach', text: replyText });
      } catch (err) {
        console.error('[CoachDock] send failed', err);
        setError('Coach is unavailable right now. Try again soon.');
      } finally {
        setPending(false);
      }
    },
    [appendMessage, onSend, pending],
  );

  const stopRecognition = useCallback((abort = false) => {
    const instance = recognitionRef.current;
    if (!instance) return;
    try {
      if (abort && typeof instance.abort === 'function') {
        instance.abort();
      } else if (typeof instance.stop === 'function') {
        instance.stop();
      }
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const startRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError('Speech recognition not supported in this browser.');
      return;
    }
    stopRecognition(true);
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    let interim = '';
    let final = '';

    recognition.onstart = () => {
      setListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          final = `${final} ${result[0].transcript}`.trim();
        } else {
          interim += result[0].transcript;
        }
      }
      setInput((prev) => (interim ? `${prev} ${interim}`.trim() : prev));
    };

    recognition.onerror = (evt: any) => {
      console.warn('[CoachDock] recognition error', evt);
      setError('Mic input failed. Try again.');
      stopRecognition(true);
    };

    recognition.onend = async () => {
      setListening(false);
      recognitionRef.current = null;
      if (final.trim()) {
        await handleSend(final.trim());
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('[CoachDock] failed to start recognition', error);
      setError('Unable to start microphone.');
    }
  }, [handleSend, stopRecognition]);

  useEffect(() => {
    if (!open) {
      stopRecognition(true);
    }
    return () => {
      stopRecognition(true);
    };
  }, [open, stopRecognition]);

  const handlePointerDown = useCallback(() => {
    if (pending) return;
    startRecognition();
  }, [pending, startRecognition]);

  const handlePointerUp = useCallback(() => {
    stopRecognition(false);
  }, [stopRecognition]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-end bg-black/40 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => {
          stopRecognition(true);
          onClose();
        }}
        className="absolute inset-0 h-full w-full cursor-default"
        aria-hidden="true"
      />
      <div className="relative z-[92] w-full max-w-md rounded-t-3xl border border-zinc-800/60 bg-zinc-950/95 px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-5 shadow-[0_-22px_60px_rgba(15,15,15,0.65)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full bg-emerald-500/25 blur-md" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/40 bg-zinc-900 text-emerald-200">
                DJ
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">Coach</p>
              <p className="text-sm text-zinc-200">{lastPreview || 'Ready when you are.'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopRecognition(true);
              onClose();
            }}
            className="rounded-full border border-zinc-700/70 bg-zinc-900/80 p-2 text-zinc-400 transition hover:text-zinc-200"
            aria-label="Close coach dock"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 max-h-56 overflow-y-auto space-y-3 pr-1">
          {messages.map((entry) => (
            <div
              key={entry.id}
              className={classNames('text-sm leading-snug', {
                'text-emerald-200': entry.role === 'coach',
                'text-zinc-200': entry.role === 'user',
              })}
            >
              {entry.text}
            </div>
          ))}
          {error ? <p className="text-xs text-amber-300">{error}</p> : null}
        </div>

        <div className="flex items-end gap-3">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(evt) => setInput(evt.target.value)}
              placeholder={listening ? 'Listening…' : 'Ask about sets, load, recovery…'}
              rows={1}
              className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 pr-12 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleSend(input)}
              disabled={pending || !input.trim()}
              className={classNames(
                'absolute bottom-2.5 right-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full border transition',
                pending || !input.trim()
                  ? 'cursor-not-allowed border-zinc-700 text-zinc-600'
                  : 'border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/10',
              )}
              aria-label="Send message"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            disabled={pending}
            className={classNames(
              'relative flex h-12 w-12 items-center justify-center rounded-full border transition',
              listening
                ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-100'
                : 'border-zinc-700 bg-zinc-900/80 text-zinc-200 hover:border-emerald-400/50 hover:text-emerald-100',
              pending && 'opacity-50',
            )}
            aria-label="Hold to talk"
          >
            {listening ? (
              <div className="absolute inset-2 flex items-end justify-center gap-[3px]">
                {avatarColors.map((cls, idx) => (
                  <span
                    key={cls}
                    className={classNames(
                      cls,
                      'h-3 w-[3px] animate-pulse rounded-full',
                      idx === 1 && 'delay-150',
                      idx === 2 && 'delay-300',
                    )}
                  />
                ))}
              </div>
            ) : null}
            <Mic size={18} className={listening ? 'opacity-0' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoachDock;
