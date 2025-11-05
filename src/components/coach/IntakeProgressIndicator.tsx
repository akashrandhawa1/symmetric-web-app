import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface IntakeProgressIndicatorProps {
  current: number;
  total: number;
  phase?: string;
}

export default function IntakeProgressIndicator({ current, total, phase = "Building your plan" }: IntakeProgressIndicatorProps) {
  const percentage = Math.round((current / total) * 100);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastPercentage, setLastPercentage] = useState(0);

  // Trigger celebration on milestone
  useEffect(() => {
    if (percentage >= 50 && lastPercentage < 50) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
    if (percentage >= 100 && lastPercentage < 100) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
    setLastPercentage(percentage);
  }, [percentage, lastPercentage]);

  // Color shift from blue → teal as progress advances
  const progressGradient = percentage >= 70
    ? "from-[rgb(0,217,163)] via-[rgb(34,197,187)] to-blue-400"
    : percentage >= 40
    ? "from-blue-500 via-[rgb(59,130,246)] to-[rgb(96,165,250)]"
    : "from-blue-600 via-blue-500 to-blue-400";

  return (
    <div className="sticky top-0 z-10 bg-gradient-to-b from-neutral-900 via-neutral-900 to-transparent pb-4 pt-2">
      <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
        <span className="font-medium">{phase}</span>
        <span className="tabular-nums">{current}/{total}</span>
      </div>
      <div className="relative h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${progressGradient}`}
          initial={{ width: '0%' }}
          animate={{
            width: `${percentage}%`,
            boxShadow: showCelebration
              ? "0 0 20px rgba(0, 217, 163, 0.6)"
              : "0 0 0px rgba(0, 217, 163, 0)"
          }}
          transition={{
            width: {
              type: "spring",
              stiffness: 100,
              damping: 20,
              mass: 0.8
            },
            boxShadow: {
              duration: 0.3
            }
          }}
        />
        {/* Celebration pulse */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-[rgb(0,217,163)]/40 to-transparent rounded-full"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.8, 1.2, 1.5]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>
      </div>
      {percentage >= 50 && percentage < 100 && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-[rgb(0,217,163)] mt-2 text-right font-medium"
        >
          Almost there! 🎯
        </motion.p>
      )}
      {percentage >= 100 && (
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-xs text-[rgb(0,217,163)] mt-2 text-right font-semibold"
        >
          Perfect! Ready to build your plan ✨
        </motion.p>
      )}
    </div>
  );
}
