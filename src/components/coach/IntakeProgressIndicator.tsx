import React from "react";
import { motion } from "framer-motion";

interface IntakeProgressIndicatorProps {
  current: number;
  total: number;
  phase?: string;
}

export default function IntakeProgressIndicator({ current, total, phase = "Building your plan" }: IntakeProgressIndicatorProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="sticky top-0 z-10 bg-gradient-to-b from-neutral-900 via-neutral-900 to-transparent pb-4 pt-2">
      <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
        <span className="font-medium">{phase}</span>
        <span className="tabular-nums">{current}/{total}</span>
      </div>
      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400"
          initial={{ width: '0%' }}
          animate={{ width: `${percentage}%` }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 20,
            mass: 0.8
          }}
        />
      </div>
      {percentage >= 50 && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-blue-400 mt-2 text-right"
        >
          Almost there! 🎯
        </motion.p>
      )}
    </div>
  );
}
