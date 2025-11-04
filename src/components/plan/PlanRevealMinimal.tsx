import React from "react";
import { motion } from "framer-motion";
import type { PlanRevealMinimalProps } from "./PlanRevealMinimal.types";
import PhaseCard from "./PhaseCard";
import PlanSummaryLine from "./PlanSummaryLine";
import ConstraintPill from "./ConstraintPill";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    }
  }
};

export default function PlanRevealMinimal({
  eyebrow,
  title,
  why,
  summary,
  constraints,
  phases,
  nextSession,
  cta,
  onStart,
  onHelpClick,
}: PlanRevealMinimalProps) {
  const getCTASubtext = () => {
    if (cta.currentReadiness !== undefined) {
      if (cta.currentReadiness >= 80) {
        return `Your readiness: ${cta.currentReadiness} → Perfect for heavy work`;
      } else if (cta.currentReadiness >= 65) {
        return `Your readiness: ${cta.currentReadiness} → Great for training`;
      } else if (cta.currentReadiness >= 50) {
        return `Your readiness: ${cta.currentReadiness} → We'll manage volume`;
      } else {
        return `Your readiness: ${cta.currentReadiness} → We'll adjust for recovery`;
      }
    }
    return cta.subtext;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Safe area top spacer */}
      <div className="h-safe-or-12" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-md px-4 pb-32"
      >
        {/* Progress dots */}
        <motion.div variants={itemVariants} className="flex gap-1 mb-6">
          <div className="h-1 w-8 rounded-full bg-green-500" />
          <div className="h-1 w-8 rounded-full bg-green-500" />
          <div className="h-1 w-8 rounded-full bg-neutral-700" />
        </motion.div>

        {/* Header */}
        <motion.header variants={itemVariants} className="mb-8">
          {eyebrow && (
            <p className="text-xs font-medium uppercase tracking-wider text-blue-400 mb-2">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl font-bold text-white leading-tight">
            {title}
          </h1>
        </motion.header>

        {/* Your Why */}
        <motion.section variants={itemVariants} className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
            Your Why
          </h2>
          <p className="text-base text-neutral-200 leading-relaxed">
            {why}
          </p>
        </motion.section>

        {/* Summary Line */}
        <motion.section variants={itemVariants} className="mb-6">
          <PlanSummaryLine {...summary} />
        </motion.section>

        {/* Constraints */}
        {constraints && constraints.length > 0 && (
          <motion.section variants={itemVariants} className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
              Safety Notes
            </h2>
            <div className="flex flex-wrap gap-2">
              {constraints.map((constraint, index) => (
                <ConstraintPill key={index} {...constraint} index={index} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Phases */}
        <motion.section variants={itemVariants} className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
            Your Journey
          </h2>
          <div className="space-y-3">
            {phases.map((phase, index) => (
              <PhaseCard key={index} {...phase} index={index} />
            ))}
          </div>
        </motion.section>

        {/* Next Session */}
        {nextSession && (
          <motion.section
            variants={itemVariants}
            className="mb-8 rounded-2xl border border-neutral-700/40 bg-neutral-800/30 p-4"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Next Session
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-neutral-300">
                <span className="font-medium">{nextSession.duration} min</span>
                <span className="text-neutral-600">•</span>
                <span>{nextSession.focus}</span>
              </div>
              {nextSession.preview && nextSession.preview.length > 0 && (
                <p className="text-xs text-neutral-400">
                  {nextSession.preview.join(', ')}{nextSession.preview.length < 4 && ', +more'}
                </p>
              )}
              {nextSession.estimatedDrop && (
                <p className="text-xs text-neutral-500">
                  Estimated fatigue: −{nextSession.estimatedDrop[0]}–{nextSession.estimatedDrop[1]}%
                </p>
              )}
            </div>
          </motion.section>
        )}

        {/* Help Link */}
        {onHelpClick && (
          <motion.div variants={itemVariants} className="mb-4 text-center">
            <button
              onClick={onHelpClick}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors underline"
            >
              Questions about your plan?
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Sticky CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
          delay: 0.4,
        }}
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur-lg pb-safe-or-4"
      >
        <div className="mx-auto max-w-md px-4 pt-4">
          <button
            onClick={onStart}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 py-4 px-6 text-base font-bold text-white shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] hover:shadow-blue-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            style={{ minHeight: '44px' }}
          >
            {cta.label}
          </button>
          <p className="mt-2 text-center text-xs text-neutral-400">
            {getCTASubtext()}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
