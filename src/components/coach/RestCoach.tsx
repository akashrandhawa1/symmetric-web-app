import React, { useEffect, useState } from 'react';

export type RestCoachAction = 'did' | 'skip' | 'override';

export default function RestCoach({
  primary,
  secondary,
  seconds = 90,
  onAction,
}: {
  primary: string;
  secondary: string;
  seconds?: number;
  onAction: (action: RestCoachAction) => void;
}) {
  const [timer, setTimer] = useState(seconds);

  useEffect(() => {
    setTimer(seconds);
  }, [seconds]);

  useEffect(() => {
    const id = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-950/95 p-4 shadow-xl">
      <div className="text-base font-medium text-white">{primary}</div>
      <div className="mt-1 text-sm text-neutral-400">{secondary}</div>
      <div className="mt-4 text-4xl font-mono text-white">{String(timer).padStart(2, '0')}s</div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onAction('did')}
          className="h-10 rounded-xl bg-white text-sm font-semibold text-black transition hover:bg-white/90"
        >
          Did it
        </button>
        <button
          type="button"
          onClick={() => onAction('skip')}
          className="h-10 rounded-xl border border-white/15 text-sm text-white transition hover:border-white/40"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => onAction('override')}
          className="h-10 rounded-xl border border-white/15 text-sm text-white transition hover:border-white/40"
        >
          Do anyway
        </button>
      </div>
    </div>
  );
}

