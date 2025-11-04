/**
 * ChipSelector Component
 *
 * Multi-select or single-select chip buttons for intake questions
 */

import React from "react";
import { motion } from "framer-motion";

export interface ChipOption {
  id: string;
  icon?: string;
  label: string;
  detail?: string;
  description?: string;
}

interface ChipSelectorProps {
  options: ChipOption[];
  selected: string[];
  onSelect: (id: string) => void;
  multiSelect?: boolean;
  className?: string;
}

export const ChipSelector: React.FC<ChipSelectorProps> = ({
  options,
  selected,
  onSelect,
  multiSelect = false,
  className = "",
}) => {
  const handleClick = (id: string) => {
    if (multiSelect) {
      onSelect(id);
    } else {
      // Single select - only allow one
      onSelect(id);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {options.map((option) => {
        const isSelected = selected.includes(option.id);

        return (
          <motion.button
            key={option.id}
            type="button"
            onClick={() => handleClick(option.id)}
            className={`
              w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left
              ${
                isSelected
                  ? "bg-gradient-to-r from-[#00D9A3] to-[#00B088] border-[#00D9A3] text-[#0A0E14]"
                  : "bg-[#1E2530] border-[rgba(0,217,163,0.3)] text-[#E8EDF2] hover:border-[#00D9A3] hover:bg-[rgba(0,217,163,0.1)]"
              }
            `}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            {multiSelect && (
              <div
                className={`
                  flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5
                  ${
                    isSelected
                      ? "bg-[#0A0E14] border-[#0A0E14]"
                      : "bg-transparent border-[rgba(0,217,163,0.5)]"
                  }
                `}
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-[#00D9A3]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2">
                {option.icon && (
                  <span className="text-2xl" role="img" aria-hidden="true">
                    {option.icon}
                  </span>
                )}
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`font-semibold ${
                        isSelected ? "text-[#0A0E14]" : "text-[#E8EDF2]"
                      }`}
                    >
                      {option.label}
                    </span>
                    {option.detail && (
                      <span
                        className={`text-sm ${
                          isSelected
                            ? "text-[rgba(10,14,20,0.7)]"
                            : "text-[rgba(232,237,242,0.6)]"
                        }`}
                      >
                        {option.detail}
                      </span>
                    )}
                  </div>
                  {option.description && (
                    <p
                      className={`text-sm mt-1 ${
                        isSelected
                          ? "text-[rgba(10,14,20,0.8)]"
                          : "text-[rgba(232,237,242,0.7)]"
                      }`}
                    >
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};
