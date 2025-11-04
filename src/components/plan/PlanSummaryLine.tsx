import React from "react";
import { motion } from "framer-motion";
import type { PlanSummary } from "./PlanRevealMinimal.types";

interface PlanSummaryLineProps extends PlanSummary {}

export default function PlanSummaryLine({
  sport,
  sportEmoji,
  weeks,
  daysPerWeek,
  sessionMinutes,
  setting,
  hasEquipmentMismatch,
  equipmentMismatchMessage,
}: PlanSummaryLineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        delay: 0.12,
      }}
      className="space-y-3"
    >
      {/* Main summary line */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {sport && (
          <>
            <span className="font-bold text-white">
              {sportEmoji && `${sportEmoji} `}{sport}
            </span>
            <span className="text-neutral-500">•</span>
          </>
        )}
        <span className="text-neutral-300">{weeks} {weeks === 1 ? 'week' : 'weeks'}</span>
        <span className="text-neutral-500">•</span>
        <span className="text-neutral-300">{daysPerWeek}× weekly</span>
        <span className="text-neutral-500">•</span>
        <span className="text-neutral-300">{sessionMinutes} min</span>
        <span className="text-neutral-500">•</span>
        <span className={`${setting.toLowerCase().includes('minimal') || setting.toLowerCase().includes('bodyweight') ? 'text-amber-400' : 'text-neutral-300'}`}>
          {setting}
        </span>
      </div>

      {/* Equipment mismatch warning */}
      {hasEquipmentMismatch && equipmentMismatchMessage && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
          <p className="text-xs text-amber-200 leading-relaxed">
            💡 {equipmentMismatchMessage}
          </p>
        </div>
      )}
    </motion.div>
  );
}
