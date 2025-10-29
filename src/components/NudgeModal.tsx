import React from "react";
import { motion, AnimatePresence } from "framer-motion";

type NudgeModalProps = {
  isOpen: boolean;
  readiness: number | null;
  message: string;
  onClose: () => void;
};

function readinessLabel(readiness: number | null): string {
  if (readiness == null) return "Take a breath and settle in.";
  if (readiness >= 80) return "You're primed — let it pop.";
  if (readiness >= 60) return "Plenty left in the tank.";
  return "Ease back in, then groove.";
}

export const NudgeModal: React.FC<NudgeModalProps> = ({ isOpen, readiness, message, onClose }) => {
  const readinessValue = typeof readiness === "number" ? Math.round(readiness) : null;
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="mx-4 w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-white shadow-2xl"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/55">Quick Nudge</p>
                <h2 className="mt-2 text-xl font-semibold">{readinessLabel(readiness)}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-white/35 hover:text-white"
              >
                Close
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-white/80">{message}</p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/65">
              Readiness score <span className="font-semibold text-white">{readinessValue ?? "--"}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NudgeModal;
