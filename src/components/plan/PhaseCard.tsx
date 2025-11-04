import React from "react";
import { motion } from "framer-motion";
import type { Phase } from "./PlanRevealMinimal.types";

interface PhaseCardProps extends Phase {
  index: number;
}

export default function PhaseCard({ title, weekRange, focus, outcome, status, index }: PhaseCardProps) {
  const isActive = status === 'active';
  const isUpcoming = status === 'upcoming';
  const isCompleted = status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        delay: index * 0.08 + 0.2,
      }}
      className={`
        relative rounded-2xl border p-4 transition-all
        ${isActive
          ? 'border-blue-500/40 bg-blue-500/10 shadow-lg shadow-blue-500/10'
          : isCompleted
          ? 'border-green-500/20 bg-green-500/5'
          : 'border-neutral-700/40 bg-neutral-800/30'
        }
        ${isUpcoming ? 'opacity-60' : 'opacity-100'}
      `}
    >
      {/* Status indicator */}
      {isCompleted && (
        <div className="absolute top-3 right-3">
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      {isUpcoming && (
        <div className="absolute top-3 right-3">
          <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      )}

      <div className="space-y-2">
        {/* Title and week range */}
        <div>
          <h3 className={`text-lg font-bold ${isActive ? 'text-blue-100' : isCompleted ? 'text-green-100' : 'text-neutral-200'}`}>
            {title}
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">{weekRange}</p>
        </div>

        {/* Focus */}
        <p className="text-sm text-neutral-300 leading-relaxed">
          {focus}
        </p>

        {/* Outcome (optional) */}
        {outcome && (
          <p className="text-xs italic text-neutral-400 border-l-2 border-neutral-600 pl-3 mt-2">
            {outcome}
          </p>
        )}

        {/* Upcoming label */}
        {isUpcoming && (
          <div className="text-xs text-neutral-500 mt-2">
            Unlocks {weekRange.split('–')[0].replace('Week', 'Week')}
          </div>
        )}
      </div>
    </motion.div>
  );
}
