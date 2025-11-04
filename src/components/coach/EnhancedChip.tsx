import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EnhancedChipProps {
  label: string;
  value: string;
  hint?: string;
  icon?: string;
  recommended?: boolean;
  shortcut?: string;
  onClick: (value: string) => void;
  disabled?: boolean;
}

export default function EnhancedChip({
  label,
  value,
  hint,
  icon,
  recommended,
  shortcut,
  onClick,
  disabled
}: EnhancedChipProps) {
  const [isSelected, setIsSelected] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleClick = async () => {
    if (disabled) return;

    // Instant visual feedback
    setIsSelected(true);

    // Call onClick after brief delay for animation
    setTimeout(() => {
      onClick(value);
    }, 300);
  };

  return (
    <div className="relative">
      <motion.button
        onClick={handleClick}
        onHoverStart={() => setShowHint(true)}
        onHoverEnd={() => setShowHint(false)}
        disabled={disabled}
        whileTap={{ scale: 0.95 }}
        animate={{
          backgroundColor: isSelected
            ? 'rgb(0, 217, 163)' // Milo teal
            : recommended
            ? 'rgba(0, 217, 163, 0.15)'
            : 'rgb(38, 38, 38)',
          scale: isSelected ? 1.02 : 1,
          borderColor: isSelected
            ? 'rgb(0, 217, 163)' // Milo teal
            : recommended
            ? 'rgba(0, 217, 163, 0.4)'
            : 'rgb(64, 64, 64)'
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`
          relative inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium
          border transition-all
          ${isSelected ? 'text-neutral-900 shadow-lg shadow-[rgb(0,217,163)]/30' : 'text-neutral-300'}
          ${recommended && !isSelected ? 'ring-2 ring-[rgb(0,217,163)]/30' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
        `}
        style={{ minHeight: '44px' }}
      >
        {icon && <span className="text-base">{icon}</span>}
        <span>{label}</span>
        {recommended && !isSelected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-xs"
          >
            ⭐
          </motion.span>
        )}
        {shortcut && (
          <kbd className="ml-1 hidden sm:inline-block rounded bg-neutral-700 px-1.5 py-0.5 text-xs text-neutral-400">
            {shortcut}
          </kbd>
        )}
        <AnimatePresence>
          {isSelected && (
            <motion.svg
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Hint tooltip */}
      <AnimatePresence>
        {showHint && hint && !isSelected && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 shadow-xl border border-neutral-700 pointer-events-none z-20"
          >
            {hint}
            <div className="absolute left-1/2 top-full -translate-x-1/2 -mt-1 border-4 border-transparent border-t-neutral-800" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
