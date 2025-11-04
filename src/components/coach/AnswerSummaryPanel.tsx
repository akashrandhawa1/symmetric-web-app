import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Answer {
  key: string;
  label: string;
  value: string;
}

interface AnswerSummaryPanelProps {
  answers: Answer[];
  isOpen: boolean;
  onToggle: () => void;
  onEdit?: (key: string) => void;
}

export default function AnswerSummaryPanel({ answers, isOpen, onToggle, onEdit }: AnswerSummaryPanelProps) {
  return (
    <div className="mb-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="mb-3 rounded-2xl border border-neutral-700 bg-neutral-800/50 backdrop-blur-sm p-4">
              <h3 className="text-sm font-semibold text-neutral-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Your answers so far
              </h3>
              <div className="space-y-2.5">
                {answers.map((answer, index) => (
                  <motion.div
                    key={answer.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex justify-between items-center text-xs"
                  >
                    <span className="text-neutral-500 font-medium">{answer.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-300">{answer.value}</span>
                      {onEdit && (
                        <button
                          onClick={() => onEdit(answer.key)}
                          className="text-blue-400 hover:text-blue-300 transition-colors active:scale-95"
                          aria-label={`Edit ${answer.label}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors group"
      >
        <motion.svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
        <span className="group-hover:underline">
          {isOpen ? 'Hide' : 'Review'} your answers ({answers.length})
        </span>
      </button>
    </div>
  );
}
