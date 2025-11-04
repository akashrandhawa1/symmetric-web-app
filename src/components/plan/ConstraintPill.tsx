import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Constraint } from "./PlanRevealMinimal.types";

interface ConstraintPillProps extends Constraint {
  index: number;
}

export default function ConstraintPill({ label, explanation, severity = 'info', index }: ConstraintPillProps) {
  const [showExplanation, setShowExplanation] = useState(false);

  const isWarning = severity === 'warning';

  return (
    <div className="relative">
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
          delay: index * 0.05 + 0.15,
        }}
        onClick={() => explanation && setShowExplanation(!showExplanation)}
        className={`
          inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium
          transition-all active:scale-95
          ${isWarning
            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
            : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
          }
          ${explanation ? 'cursor-pointer hover:bg-opacity-20' : 'cursor-default'}
        `}
        aria-label={`Constraint: ${label}`}
        aria-pressed={showExplanation}
      >
        {isWarning && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        {label}
        {explanation && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </motion.button>

      {/* Explanation popover */}
      <AnimatePresence>
        {showExplanation && explanation && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExplanation(false)}
              className="fixed inset-0 z-40"
            />

            {/* Popover */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute left-0 top-full mt-2 z-50 w-64 rounded-lg border border-neutral-700 bg-neutral-800 p-3 shadow-xl"
            >
              <p className="text-xs text-neutral-300 leading-relaxed">{explanation}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
