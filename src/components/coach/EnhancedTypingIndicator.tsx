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
        className="flex items-center gap-3 text-xs text-neutral-500"
      >
        {/* Breathing glow container */}
        <motion.div
          className="relative flex items-center gap-1.5"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Pulsing glow background */}
          <motion.div
            className="absolute inset-0 rounded-full bg-[rgb(0,217,163)]/20 blur-md"
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          {/* Floating dots */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="relative w-2 h-2 rounded-full bg-gradient-to-br from-[rgb(0,217,163)] to-blue-400"
              animate={{
                y: [0, -6, 0],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
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
