import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastMode = 'success' | 'neutral';

export type ToastSlots = {
  exercise?: string;
  changePct: number;
  reps: number;
  rir?: number;
  outcome: 'hit' | 'early' | 'late' | 'under';
  lockedInKg?: number;
};

export interface ComplianceToastProps {
  mode: ToastMode;
  slots: ToastSlots;
  onDismiss: () => void;
  autoDismissMs?: number;
}

/**
 * Toast notification for compliance feedback.
 * Shows success message when user listened to coach, or neutral message with suggestions.
 *
 * Accessible: Uses role="status" and aria-live for screen reader announcements.
 */
export const ComplianceToast: React.FC<ComplianceToastProps> = ({
  mode,
  slots,
  onDismiss,
  autoDismissMs = 5000,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // Wait for exit animation
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  const generateMessage = (): string => {
    const { changePct, reps, rir, outcome, lockedInKg } = slots;

    if (mode === 'success') {
      const changeStr = changePct > 0 ? `+${changePct.toFixed(1)}%` : `${changePct.toFixed(1)}%`;
      const rirStr = rir !== undefined ? ` @ RIR ${rir}` : '';

      if (outcome === 'hit') {
        return `Nice! Applied ${changeStr}, hit ${reps} reps${rirStr} — locked in${lockedInKg ? ` at ${lockedInKg}kg` : ''}.`;
      } else if (outcome === 'early') {
        return `Good listen! Applied ${changeStr}, managed ${reps} reps${rirStr}.`;
      } else {
        return `Applied ${changeStr}, completed ${reps} reps${rirStr}.`;
      }
    } else {
      // Neutral - provide a suggestion
      if (outcome === 'late') {
        return `Still fresh at rep ${reps} — try +2.5% or aim for 5-6 reps.`;
      } else if (outcome === 'under') {
        return `Only ${reps} reps logged — aim for at least 5 quality reps.`;
      } else if (outcome === 'early') {
        return `Fatigue hit at rep ${reps} — try -2.5% next set for 5-6 reps.`;
      } else {
        return `${reps} reps completed — keep aiming for the 5-6 window with RIR 1-2.`;
      }
    }
  };

  const message = generateMessage();

  const bgColor = mode === 'success'
    ? 'bg-emerald-900/90 border-emerald-500/30'
    : 'bg-blue-900/90 border-blue-500/30';

  const icon = mode === 'success' ? '✓' : '💡';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className={`${bgColor} border rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm flex items-start gap-3`}>
            <span className="text-2xl flex-shrink-0" aria-hidden="true">{icon}</span>
            <p className="text-white text-sm leading-relaxed flex-1">{message}</p>
            <button
              onClick={() => {
                setVisible(false);
                setTimeout(onDismiss, 300);
              }}
              className="text-white/60 hover:text-white text-lg leading-none flex-shrink-0"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Hook to manage toast notifications.
 */
export function useComplianceToast() {
  const [toast, setToast] = useState<{
    mode: ToastMode;
    slots: ToastSlots;
  } | null>(null);

  const showToast = (mode: ToastMode, slots: ToastSlots) => {
    setToast({ mode, slots });
  };

  const dismissToast = () => {
    setToast(null);
  };

  return {
    toast,
    showToast,
    dismissToast,
  };
}
