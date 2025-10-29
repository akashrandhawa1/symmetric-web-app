/**
 * Set Label Sheet - User Feedback Collection
 *
 * Bottom sheet UI for users to label completed sets.
 * Labels feed into exercise recommendation ML pipeline.
 *
 * @module components/coach/SetLabelSheet
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SetLabel } from '../../lib/coach/exerciseTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface SetLabelSheetProps {
  /** Whether sheet is visible */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Submit handler with selected label */
  onSubmit: (label: SetLabel) => void;
  /** Optional: Override prompt text */
  promptText?: string;
  /** Optional: Show skip button */
  allowSkip?: boolean;
}

// ============================================================================
// LABEL OPTIONS
// ============================================================================

const LABEL_OPTIONS: Array<{
  key: SetLabel;
  label: string;
  emoji: string;
  color: string;
  description: string;
}> = [
  {
    key: 'felt_strong',
    label: 'Felt Strong',
    emoji: '💪',
    color: 'bg-emerald-600 hover:bg-emerald-500',
    description: 'Good bar speed, solid form',
  },
  {
    key: 'neutral',
    label: 'Neutral',
    emoji: '😐',
    color: 'bg-slate-600 hover:bg-slate-500',
    description: 'Manageable work, no flags',
  },
  {
    key: 'fatiguing',
    label: 'Fatiguing',
    emoji: '😮‍💨',
    color: 'bg-amber-600 hover:bg-amber-500',
    description: 'Effort was high, form drifting',
  },
  {
    key: 'pain_flag',
    label: 'Pain',
    emoji: '⚠️',
    color: 'bg-red-600 hover:bg-red-500',
    description: 'Discomfort or pain during set',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const SetLabelSheet: React.FC<SetLabelSheetProps> = ({
  open,
  onClose,
  onSubmit,
  promptText = 'How did that set feel?',
  allowSkip = true,
}) => {
  const handleSubmit = (label: SetLabel) => {
    onSubmit(label);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50"
          >
            <div className="w-full max-w-lg mx-auto rounded-t-3xl bg-gradient-to-b from-gray-800 to-gray-900 border-t border-gray-700 shadow-2xl">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 rounded-full bg-gray-600" />
              </div>

              {/* Content */}
              <div className="px-6 pb-6 space-y-4">
                {/* Prompt */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-1">{promptText}</h3>
                  <p className="text-sm text-gray-400">
                    Your feedback helps coach recommend better exercises
                  </p>
                </div>

                {/* Label Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {LABEL_OPTIONS.map(option => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleSubmit(option.key)}
                      className={`${option.color} rounded-xl px-4 py-3 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/30`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl" role="img" aria-label={option.label}>
                          {option.emoji}
                        </span>
                        <span className="text-sm font-semibold text-white">{option.label}</span>
                        <span className="text-xs text-white/70">{option.description}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {allowSkip && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 rounded-xl bg-gray-700 hover:bg-gray-600 py-3 text-sm font-medium text-gray-300 transition-colors"
                    >
                      Skip for now
                    </button>
                  )}
                  {!allowSkip && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full rounded-xl bg-gray-700 hover:bg-gray-600 py-3 text-sm font-medium text-gray-300 transition-colors"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// HOOK: Manage Sheet State
// ============================================================================

export interface UseSetLabelSheetResult {
  /** Whether sheet is open */
  isOpen: boolean;
  /** Open the sheet */
  open: () => void;
  /** Close the sheet */
  close: () => void;
  /** Current label (if submitted) */
  label: SetLabel | null;
  /** Submit handler */
  handleSubmit: (label: SetLabel) => void;
  /** Reset state */
  reset: () => void;
}

/**
 * Hook to manage SetLabelSheet state.
 *
 * @example
 * const labelSheet = useSetLabelSheet();
 *
 * // After set completion
 * labelSheet.open();
 *
 * // Render sheet
 * <SetLabelSheet
 *   open={labelSheet.isOpen}
 *   onClose={labelSheet.close}
 *   onSubmit={labelSheet.handleSubmit}
 * />
 *
 * // Access label
 * if (labelSheet.label) {
 *   saveSetLabel(labelSheet.label);
 * }
 */
export function useSetLabelSheet(
  onSubmitCallback?: (label: SetLabel) => void
): UseSetLabelSheetResult {
  const [isOpen, setIsOpen] = React.useState(false);
  const [label, setLabel] = React.useState<SetLabel | null>(null);

  const open = React.useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSubmit = React.useCallback(
    (newLabel: SetLabel) => {
      setLabel(newLabel);
      onSubmitCallback?.(newLabel);
    },
    [onSubmitCallback]
  );

  const reset = React.useCallback(() => {
    setLabel(null);
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    open,
    close,
    label,
    handleSubmit,
    reset,
  };
}

// ============================================================================
// STORAGE HELPER (Optional)
// ============================================================================

/**
 * Save set label to local storage.
 * Extend this to sync with your backend/analytics.
 */
export function saveSetLabel(params: {
  setId: string;
  exerciseId: string;
  label: SetLabel;
  timestamp: number;
}): void {
  try {
    const key = 'symmetric_set_labels';
    const stored = localStorage.getItem(key);
    const labels = stored ? JSON.parse(stored) : [];

    labels.push({
      setId: params.setId,
      exerciseId: params.exerciseId,
      label: params.label,
      timestamp: params.timestamp,
    });

    // Keep last 100 labels
    if (labels.length > 100) {
      labels.shift();
    }

    localStorage.setItem(key, JSON.stringify(labels));
  } catch (error) {
    console.warn('[SetLabelSheet] Failed to save label:', error);
  }
}

/**
 * Get recent set labels for an exercise.
 */
export function getRecentLabels(params: {
  exerciseId?: string;
  limit?: number;
}): Array<{ setId: string; exerciseId: string; label: SetLabel; timestamp: number }> {
  try {
    const key = 'symmetric_set_labels';
    const stored = localStorage.getItem(key);
    if (!stored) return [];

    const labels = JSON.parse(stored);

    let filtered = labels;
    if (params.exerciseId) {
      filtered = labels.filter((l: any) => l.exerciseId === params.exerciseId);
    }

    return filtered.slice(-(params.limit ?? 20));
  } catch (error) {
    console.warn('[SetLabelSheet] Failed to load labels:', error);
    return [];
  }
}
