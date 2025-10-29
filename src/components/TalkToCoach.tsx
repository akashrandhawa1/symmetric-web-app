import React, { useState, useEffect, useRef } from 'react';

interface TalkToCoachProps {
  isExpanded: boolean;
  onToggle: () => void;
  onSend: (message: string) => void;
  quickReplies: string[];
  disabled?: boolean;
  isBusy?: boolean;
}

export const TalkToCoach: React.FC<TalkToCoachProps> = ({ isExpanded, onToggle, onSend, quickReplies, disabled = false, isBusy = false }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isExpanded) {
      setValue('');
      return;
    }
    inputRef.current?.focus();
  }, [isExpanded]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  };

  if (!isExpanded) {
    return null;
  }

  return (
    <div className="w-full space-y-4 rounded-2xl border border-slate-700/70 bg-slate-900/60 p-5 shadow-[0_18px_32px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSend();
            }
            if (event.key === 'Escape') {
              onToggle();
            }
          }}
          placeholder="Ask the coach…"
          aria-label="Ask your coach"
          ref={inputRef}
          className="flex-1 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/60 transition-shadow"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!value.trim() || disabled || isBusy}
          className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition-opacity disabled:opacity-40"
        >
          Send
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Close
        </button>
      </div>
      {quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => onSend(reply)}
              className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 transition-colors"
              disabled={disabled || isBusy}
            >
              {reply}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
