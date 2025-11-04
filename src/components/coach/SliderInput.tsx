import React, { useState } from "react";
import { motion } from "framer-motion";

interface SliderInputProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  unit?: string;
  suffix?: string;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  icon?: string;
}

export default function SliderInput({
  label,
  min,
  max,
  step = 1,
  defaultValue,
  unit = "",
  suffix = "",
  onChange,
  formatValue,
  icon,
}: SliderInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setValue(newValue);
    onChange(newValue);
  };

  const percentage = ((value - min) / (max - min)) * 100;

  const displayValue = formatValue ? formatValue(value) : `${value}${unit}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-300 flex items-center gap-2">
          {icon && <span className="text-base">{icon}</span>}
          {label}
        </label>
        <motion.div
          animate={{ scale: isDragging ? 1.1 : 1 }}
          className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm font-semibold text-[rgb(0,217,163)]"
        >
          {displayValue}{suffix}
        </motion.div>
      </div>

      <div className="relative h-10 flex items-center">
        {/* Track background */}
        <div className="absolute inset-0 flex items-center">
          <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
            {/* Active track */}
            <motion.div
              className="h-full bg-gradient-to-r from-[rgb(0,217,163)] to-[rgb(0,184,138)]"
              style={{ width: `${percentage}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        </div>

        {/* Slider input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="relative w-full h-10 appearance-none bg-transparent cursor-pointer z-10"
          style={{
            WebkitAppearance: "none",
          }}
        />

        {/* Custom thumb (visual only) */}
        <motion.div
          className="absolute pointer-events-none"
          style={{ left: `calc(${percentage}% - 12px)` }}
          animate={{
            scale: isDragging ? 1.3 : 1,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="w-6 h-6 rounded-full bg-[rgb(0,217,163)] shadow-lg shadow-[rgb(0,217,163)]/50 border-4 border-neutral-900" />
        </motion.div>
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between text-xs text-neutral-500">
        <span>{formatValue ? formatValue(min) : `${min}${unit}`}</span>
        <span>{formatValue ? formatValue(max) : `${max}${unit}`}</span>
      </div>

      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: transparent;
          cursor: pointer;
        }

        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: transparent;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
