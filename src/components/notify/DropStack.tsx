import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type DropNote = {
  id: string;
  title: string;
  body?: string;
  tone?: 'success' | 'warn' | 'info';
  ttlMs?: number;
};

export default function DropStack({
  notes,
  onDismiss,
}: {
  notes: DropNote[];
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timers = notes.map((note) =>
      setTimeout(() => onDismiss(note.id), note.ttlMs ?? 1400),
    );
    return () => {
      timers.forEach((id) => clearTimeout(id));
    };
  }, [notes, onDismiss]);

  return (
    <div className="fixed top-3 left-1/2 z-50 w-[92%] max-w-sm -translate-x-1/2 space-y-2">
      <AnimatePresence initial={false}>
        {notes.map((note) => (
          <motion.div
            key={note.id}
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            layout
            className={[
              'cursor-pointer rounded-xl border px-3 py-2 text-sm shadow-md backdrop-blur-md',
              note.tone === 'success'
                ? 'border-emerald-400/30 bg-emerald-900/30 text-emerald-100'
                : note.tone === 'warn'
                ? 'border-amber-400/30 bg-amber-900/30 text-amber-100'
                : 'border-white/10 bg-neutral-900/80 text-neutral-100',
            ].join(' ')}
            onClick={() => onDismiss(note.id)}
          >
            <div className="font-medium">{note.title}</div>
            {note.body ? <div className="mt-0.5 text-xs opacity-80">{note.body}</div> : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

