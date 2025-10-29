/**
 * SlideUpPanel Component
 *
 * A reusable bottom sheet panel that slides up from the bottom of the screen.
 * Features:
 * - Smooth framer-motion animations
 * - Semi-transparent backdrop with click-to-dismiss
 * - Swipe-down gesture support
 * - Optional delay before appearing
 *
 * @module components/SlideUpPanel
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

interface SlideUpPanelProps {
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Callback when the panel should be closed */
  onClose: () => void;
  /** Panel content */
  children: React.ReactNode;
  /** Optional delay in ms before showing the panel (default: 0) */
  delay?: number;
  /** Optional z-index for the panel (default: 50) */
  zIndex?: number;
}

export function SlideUpPanel({
  isOpen,
  onClose,
  children,
  delay = 0,
  zIndex = 50,
}: SlideUpPanelProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen && delay > 0) {
      // Apply delay before showing
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, delay);
      return () => clearTimeout(timer);
    } else if (isOpen) {
      setShouldRender(true);
    } else {
      setShouldRender(false);
    }
  }, [isOpen, delay]);

  // Handle swipe down to dismiss
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // If dragged down more than 100px or velocity is significant, close
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {shouldRender && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ zIndex }}
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
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl"
            style={{ zIndex: zIndex + 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle indicator */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Content */}
            <div className="max-h-[85vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
