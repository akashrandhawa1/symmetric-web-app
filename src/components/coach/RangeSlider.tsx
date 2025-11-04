/**
 * RangeSlider Component
 *
 * Interactive slider for numeric input (session length, frequency, etc.)
 */

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface RangeSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  label?: string;
  suffix?: string;
  showValue?: boolean;
  marks?: { value: number; label: string }[];
  className?: string;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  value,
  onChange,
  step = 1,
  label,
  suffix = "",
  showValue = true,
  marks,
  className = "",
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleChange = (clientX: number) => {
    if (!trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newValue = min + (percent / 100) * (max - min);
    const steppedValue = Math.round(newValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));

    onChange(clampedValue);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleChange(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleChange(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleChange(e.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        handleChange(e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchend", handleEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging]);

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <div className="flex items-baseline justify-between">
          <label className="text-sm font-medium text-[#E8EDF2]">{label}</label>
          {showValue && (
            <span className="text-lg font-semibold text-[#00D9A3] font-mono">
              {value}
              {suffix}
            </span>
          )}
        </div>
      )}

      <div className="relative pt-2 pb-6">
        {/* Track */}
        <div
          ref={trackRef}
          className="relative h-2 bg-[#1E2530] rounded-full cursor-pointer"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Fill */}
          <motion.div
            className="absolute h-full bg-gradient-to-r from-[#00D9A3] to-[#00B088] rounded-full"
            style={{ width: `${percentage}%` }}
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.1 }}
          />

          {/* Thumb */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-[#00D9A3] rounded-full shadow-lg cursor-grab active:cursor-grabbing"
            style={{ left: `calc(${percentage}% - 12px)` }}
            initial={false}
            animate={{
              left: `calc(${percentage}% - 12px)`,
              scale: isDragging ? 1.2 : 1,
            }}
            transition={{ duration: 0.1 }}
            whileHover={{ scale: 1.1 }}
          >
            <div className="absolute inset-0 rounded-full bg-[#00D9A3] animate-ping opacity-25" />
          </motion.div>
        </div>

        {/* Marks */}
        {marks && (
          <div className="absolute w-full top-full mt-2 flex justify-between">
            {marks.map((mark) => {
              const markPercent = ((mark.value - min) / (max - min)) * 100;
              return (
                <div
                  key={mark.value}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${markPercent}%` }}
                >
                  <div className="w-0.5 h-2 bg-[rgba(232,237,242,0.3)] mx-auto" />
                  <span className="text-xs text-[rgba(232,237,242,0.5)] mt-1 block whitespace-nowrap">
                    {mark.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
