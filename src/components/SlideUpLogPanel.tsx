/**
 * SlideUpLogPanel Component
 *
 * A bottom sheet wrapper specifically designed for the LogSetCard.
 * Slides up from the bottom with smooth framer-motion animations.
 *
 * @module components/SlideUpLogPanel
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LogSetCard from './LogSetCard';

interface SlideUpLogPanelProps {
  /** Whether the panel is visible */
  show: boolean;
  /** Callback when the panel should be closed */
  onClose: () => void;
  /** Callback when the set is saved */
  onSaved?: (data: { exercise: string; weight: string }) => void;
  /** Optional initial exercise name */
  initialExercise?: string;
  /** Optional initial weight */
  initialWeight?: string;
}

export function SlideUpLogPanel({
  show,
  onClose,
  onSaved,
  initialExercise,
  initialWeight,
}: SlideUpLogPanelProps) {
  const handleSaved = (data: { exercise: string; weight: string }) => {
    console.log('Set saved:', data);
    // Notify parent that set was saved
    onSaved?.(data);
    // Close the panel after save
    setTimeout(() => {
      onClose();
    }, 2000); // Wait for the success animation to complete
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center pb-4 px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-md">
              <LogSetCard
                onSaved={handleSaved}
                initialExercise={initialExercise}
                initialWeight={initialWeight}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default SlideUpLogPanel;
