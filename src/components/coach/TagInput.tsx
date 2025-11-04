import React, { useState, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TagInputProps {
  label: string;
  placeholder: string;
  suggestions?: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  icon?: string;
}

export default function TagInput({
  label,
  placeholder,
  suggestions = [],
  onChange,
  maxTags = 10,
  icon,
}: TagInputProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = input.trim()
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(input.toLowerCase()) &&
          !tags.includes(s)
      )
    : [];

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed) || tags.length >= maxTags) return;

    const newTags = [...tags, trimmed];
    setTags(newTags);
    onChange(newTags);
    setInput("");
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    onChange(newTags);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleNoneClick = () => {
    setTags([]);
    onChange([]);
    setInput("");
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-neutral-300 flex items-center gap-2">
        {icon && <span className="text-base">{icon}</span>}
        {label}
      </label>

      {/* Input container */}
      <div className="relative">
        <div className="min-h-[48px] rounded-xl border border-neutral-700 bg-neutral-900 p-2 focus-within:border-[rgb(0,217,163)] focus-within:ring-2 focus-within:ring-[rgb(0,217,163)]/20 transition-all">
          <div className="flex flex-wrap gap-2">
            {/* Tags */}
            <AnimatePresence mode="popLayout">
              {tags.map((tag) => (
                <motion.div
                  key={tag}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  layout
                  className="flex items-center gap-1.5 rounded-lg bg-[rgb(0,217,163)] px-3 py-1.5 text-sm font-medium text-neutral-900"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-neutral-800/20 transition-colors"
                  >
                    ×
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Input */}
            {tags.length < maxTags && (
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setShowSuggestions(e.target.value.length > 0);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(input.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={tags.length === 0 ? placeholder : ""}
                className="flex-1 min-w-[120px] bg-transparent text-neutral-300 text-sm placeholder:text-neutral-600 focus:outline-none"
              />
            )}
          </div>
        </div>

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {showSuggestions && filteredSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-20 mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-800 shadow-xl overflow-hidden"
            >
              <div className="p-1 max-h-48 overflow-y-auto">
                {filteredSuggestions.slice(0, 5).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addTag(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* "Nothing to report" button */}
      {tags.length === 0 && (
        <button
          type="button"
          onClick={handleNoneClick}
          className="text-sm text-neutral-500 hover:text-[rgb(0,217,163)] transition-colors"
        >
          Nothing to report
        </button>
      )}

      {/* Helper text */}
      <p className="text-xs text-neutral-500">
        {tags.length > 0
          ? `${tags.length}/${maxTags} items • Press Enter to add`
          : "Type and press Enter to add"}
      </p>
    </div>
  );
}
