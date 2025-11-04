/**
 * TagInput Component
 *
 * Multi-entry tag input for limitations, injuries, etc.
 */

import React, { useState, useRef, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  maxTags?: number;
  className?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = "Type and press Enter",
  suggestions = [],
  maxTags,
  className = "",
}) => {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) return;
    if (maxTags && tags.length >= maxTags) return;

    onChange([...tags, trimmed]);
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setShowSuggestions(value.length > 0 && filteredSuggestions.length > 0);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() =>
            setShowSuggestions(
              inputValue.length > 0 && filteredSuggestions.length > 0
            )
          }
          placeholder={placeholder}
          disabled={maxTags ? tags.length >= maxTags : false}
          className="
            w-full px-4 py-3
            bg-[#1E2530]
            border-2 border-transparent
            rounded-xl
            text-[#E8EDF2]
            placeholder:text-[rgba(232,237,242,0.4)]
            focus:border-[#00D9A3]
            focus:outline-none
            focus:ring-4 focus:ring-[rgba(0,217,163,0.1)]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all
          "
        />

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {showSuggestions && filteredSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="
                absolute z-10 w-full mt-2
                bg-[#1E2530]
                border border-[rgba(0,217,163,0.3)]
                rounded-xl
                shadow-lg
                max-h-48 overflow-y-auto
              "
            >
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => addTag(suggestion)}
                  className="
                    w-full px-4 py-2 text-left
                    text-[#E8EDF2]
                    hover:bg-[rgba(0,217,163,0.1)]
                    transition-colors
                    first:rounded-t-xl last:rounded-b-xl
                  "
                >
                  {suggestion}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tags display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence mode="popLayout">
            {tags.map((tag, index) => (
              <motion.div
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                layout
                className="
                  flex items-center gap-2
                  px-3 py-1.5
                  bg-[rgba(0,217,163,0.15)]
                  border border-[rgba(0,217,163,0.3)]
                  rounded-lg
                  text-[#00D9A3]
                  text-sm font-medium
                "
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="
                    p-0.5
                    hover:bg-[rgba(0,217,163,0.2)]
                    rounded
                    transition-colors
                  "
                  aria-label={`Remove ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-[rgba(232,237,242,0.5)]">
        {maxTags && `${tags.length} / ${maxTags} tags`}
        {!maxTags && tags.length > 0 && `${tags.length} tag${tags.length !== 1 ? "s" : ""}`}
        {tags.length === 0 && "Press Enter to add"}
      </p>
    </div>
  );
};
