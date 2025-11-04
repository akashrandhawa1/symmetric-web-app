import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Mic, MicOff, PhoneOff } from 'lucide-react';
import { useGeminiLive } from '../../hooks/useGeminiLive';

type GeminiLiveCoachProps = {
  open: boolean;
  onClose: () => void;
};

const overlayVariants = {
  initial: { opacity: 0, scale: 1.05 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.05 },
};

const panelVariants = {
  initial: { opacity: 0, scale: 0.8, y: 60 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.21, 1, 0.29, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 40,
    transition: {
      duration: 0.25,
      ease: [0.4, 0.01, 1, 0.99],
    },
  },
};

export const GeminiLiveCoach: React.FC<GeminiLiveCoachProps> = ({ open, onClose }) => {
  const {
    state,
    isListening,
    transcript,
    assistantText,
    stage,
    connect,
    disconnect,
    startListening,
    stopListening,
  } = useGeminiLive();

  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (open && state === 'disconnected') {
      connect();
    }
  }, [open, state, connect]);

  useEffect(() => {
    if (!open && state === 'connected') {
      disconnect();
    }
  }, [open, state, disconnect]);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => setEntered(true), 220);
      return () => window.clearTimeout(id);
    }
    setEntered(false);
    return undefined;
  }, [open]);

  const handlePress = () => {
    if (state !== 'connected') return;
    if (isListening) {
      stopListening({ reason: 'manual' });
    } else {
      startListening();
    }
  };

  const stageCopy: Record<typeof stage, { title: string; subtitle: string }> = {
    idle: {
      title: 'Tap to talk',
      subtitle: 'Ask about recovery, load, or tempo — the coach already has your data.',
    },
    listening: {
      title: 'Listening…',
      subtitle: 'Share what you’re feeling or the next move you want to dial in.',
    },
    processing: {
      title: 'Coach is thinking…',
      subtitle: 'Analyzing your data...',
    },
    speaking: {
      title: 'Coach is speaking',
      subtitle: 'Hang tight for the breakdown — you’ll hear it in a beat.',
    },
  };

  const copy = stageCopy[stage];
  const eqBars = useMemo(() => Array.from({ length: 9 }), []);
  const palette = {
    idle: {
      gradient: 'linear-gradient(135deg,#3458ff,#1b2c7d)',
      border: 'rgba(255,255,255,0.35)',
      innerBg: 'bg-white/10',
      iconColor: 'text-white/70',
    },
    listening: {
      gradient: 'linear-gradient(135deg,#00f5a0,#00d9f5)',
      border: 'rgba(255,255,255,0.65)',
      innerBg: 'bg-white/12',
      iconColor: 'text-cyan-100',
    },
    processing: {
      gradient: 'linear-gradient(135deg,#fbbf24,#f97316)',
      border: 'rgba(255,255,255,0.8)',
      innerBg: 'bg-white/14',
      iconColor: 'text-amber-200',
    },
    speaking: {
      gradient: 'linear-gradient(135deg,#d946ef,#8b5cf6)',
      border: 'rgba(255,255,255,0.9)',
      innerBg: 'bg-white/16',
      iconColor: 'text-fuchsia-200',
    },
  } as const;

  const renderBody = () => {
    if (state === 'connecting') {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <motion.div
            className="h-16 w-16 rounded-full border-4 border-white/20 border-t-white/70"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="text-xl font-semibold text-white">Connecting to your coach…</p>
            <p className="text-sm text-white/70">Give us a beat while we boot the booth.</p>
          </div>
        </div>
      );
    }

    if (state === 'error') {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-xl font-semibold text-white">Couldn’t reach the DJ.</p>
          <p className="max-w-xs text-sm text-white/70">
            Check that the live coach server is running, then tap retry to reconnect.
          </p>
          <button
            type="button"
            onClick={connect}
            className="rounded-full bg-white/15 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            Retry
          </button>
        </div>
      );
    }

    const listeningPulse = entered && (isListening || stage === 'listening');
    const isProcessing = stage === 'processing';
    const isSpeaking = stage === 'speaking';
    const disabled = state !== 'connected';
    const currentPalette = palette[stage];
    const iconElement = stage === 'speaking'
      ? null
      : stage === 'idle'
      ? <MicOff className="h-12 w-12 text-white/65" />
      : <Mic className={`h-12 w-12 ${currentPalette.iconColor}`} />;

    return (
      <div className="relative flex flex-1 flex-col items-center justify-center gap-10">
        <button
          type="button"
          onClick={handlePress}
          aria-pressed={isListening}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
          disabled={disabled}
          className={`relative flex h-56 w-56 items-center justify-center focus:outline-none ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: currentPalette.gradient, opacity: 0.35 }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={
              listeningPulse
                ? { scale: [1, 1.05, 1], opacity: [0.2, 0.45, 0.2] }
                : entered
                ? { scale: 1, opacity: 0.35 }
                : { scale: 0.6, opacity: 0 }
            }
            transition={{ duration: listeningPulse ? 2.4 : 0.6, repeat: listeningPulse ? Infinity : 0, ease: 'easeInOut' }}
            aria-hidden="true"
          />
          <motion.span
            className="absolute h-[208px] w-[208px] rounded-full border-[6px]"
            style={{ borderColor: currentPalette.border }}
            animate={isSpeaking ? { scale: [1, 1.06, 1], opacity: [0.9, 0.6, 0.9] } : listeningPulse ? { scale: [0.98, 1.02, 0.98] } : { scale: 1 }}
            transition={{ duration: isSpeaking ? 1 : 1.8, repeat: isSpeaking || listeningPulse ? Infinity : 0, ease: 'easeInOut' }}
            aria-hidden="true"
          />
          <AnimatePresence>
            {isProcessing && (
              <motion.span
                key="processing-ring"
                className="absolute h-[224px] w-[224px] rounded-full border-2"
                style={{ borderColor: 'rgba(251,191,36,0.2)', borderTopColor: '#fbbf24' }}
                initial={{ rotate: 0, opacity: 0 }}
                animate={{ rotate: 360, opacity: [0.2, 0.8, 0.2] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                aria-hidden="true"
              />
            )}
          </AnimatePresence>
          <motion.span
            className={`relative flex h-44 w-44 items-center justify-center rounded-full ${disabled ? 'bg-white/10' : currentPalette.innerBg}`}
            animate={isSpeaking ? { scale: [1, 1.03, 1], opacity: [0.95, 1, 0.95] } : listeningPulse ? { scale: [1, 1.015, 1] } : { scale: 1 }}
            transition={{ duration: 1.4, repeat: isSpeaking || listeningPulse ? Infinity : 0, ease: 'easeInOut' }}
          >
            {isSpeaking && (
              <div className="absolute flex h-24 w-24 items-end justify-between">
                {eqBars.map((_, idx) => {
                  const progress = eqBars.length > 1 ? idx / (eqBars.length - 1) : 0;
                  const hue = 275 - progress * 60;
                  const color = `hsl(${hue}, 85%, 70%)`;
                  const glow = `hsla(${hue}, 90%, 72%, 0.55)`;
                  return (
                    <motion.span
                      key={idx}
                      className="w-[6px] rounded-full"
                      animate={{ height: ['22%', '90%', '28%'] }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.06 }}
                      style={{
                        height: '45%',
                        background: `linear-gradient(180deg, ${color}, ${glow})`,
                        boxShadow: `0 0 12px ${glow}`,
                      }}
                    />
                  );
                })}
              </div>
            )}
            {iconElement}
          </motion.span>
        </button>

        <div className="text-center">
          <p className="text-2xl font-semibold text-white" aria-live="polite">
            {copy.title}
          </p>
          <p className="mt-3 max-w-xs text-sm text-white/70">{copy.subtitle}</p>
        </div>

        {(transcript || assistantText) && (
          <div className="flex flex-col items-center gap-2 text-white/80" aria-live="polite">
            {transcript && (
              <div className="max-w-xs rounded-2xl bg-white/10 px-5 py-3 text-center text-sm">
                “{transcript}”
              </div>
            )}
            {assistantText && (
              <div className="max-w-xs rounded-2xl bg-white/14 px-5 py-3 text-center text-sm font-medium text-white">
                {assistantText}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[radial-gradient(circle_at_top,#103a9b,#021c3f)]"
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-label="Gemini live voice coach"
        >
          <motion.div
            variants={panelVariants}
          className="relative flex h-[min(92vh,780px)] w-[min(92vw,414px)] flex-col rounded-[32px] border border-white/12 bg-white/6 px-6 pt-6 pb-8 shadow-[0_40px_120px_rgba(2,12,29,0.5)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between text-white">
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Close voice coach"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
              <div className="text-sm font-medium">Coach Milo</div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="End session"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-10 flex flex-1 flex-col">
              {renderBody()}
            </div>

            <div className="mt-10 text-center text-[11px] leading-relaxed text-white/60">
              You’re chatting with Symmetric’s coach powered by Gemini. Don’t share sensitive info.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GeminiLiveCoach;
