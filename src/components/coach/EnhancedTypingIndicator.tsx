import React from "react";
import { motion } from "framer-motion";

interface EnhancedTypingIndicatorProps {
  takingLong?: boolean;
  onSkip?: () => void;
}

export default function EnhancedTypingIndicator({ takingLong, onSkip }: EnhancedTypingIndicatorProps) {
  return (
    <div className="flex flex-col gap-2">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 text-xs text-neutral-500"
      >
        <motion.svg
          className="w-4 h-4 text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          animate={{
            rotate: [0, 360],
            opacity: [0.3, 1, 0.3]
          }}
          transition={{
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            opacity: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </motion.svg>
        <span className="font-medium">Milo is thinking...</span>
      </motion.div>

      {takingLong && onSkip && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="text-xs text-neutral-600"
        >
          <p className="mb-1">Taking longer than usual... still working on it ⏳</p>
          <button
            onClick={onSkip}
            className="text-blue-400 hover:text-blue-300 underline transition-colors"
          >
            Skip AI, use quick flow
          </button>
        </motion.div>
      )}
    </div>
  );
}
