import { useState } from "react";
import { motion } from "framer-motion";

type BodyMetricsInputProps = {
  topic: "user_age" | "user_height" | "user_current_weight" | "user_goal_weight";
  onSubmit: (value: string) => void;
  disabled?: boolean;
};

export default function BodyMetricsInput({ topic, onSubmit, disabled }: BodyMetricsInputProps) {
  const [age, setAge] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weight, setWeight] = useState("");

  const handleSubmit = () => {
    let value = "";

    if (topic === "user_age" && age) {
      value = age;
    } else if (topic === "user_height" && heightFeet) {
      value = heightInches ? `${heightFeet}'${heightInches}"` : `${heightFeet}'0"`;
    } else if ((topic === "user_current_weight" || topic === "user_goal_weight") && weight) {
      value = `${weight} lb`;
    }

    if (value) {
      onSubmit(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, isLast: boolean) => {
    if (e.key === "Enter" && isLast) {
      handleSubmit();
    }
  };

  const isValid = () => {
    if (topic === "user_age") return age.length > 0;
    if (topic === "user_height") return heightFeet.length > 0;
    if (topic === "user_current_weight" || topic === "user_goal_weight") return weight.length > 0;
    return false;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4"
    >
      {topic === "user_age" && (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-white/60">Age (years)</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, true)}
            placeholder="28"
            min="10"
            max="100"
            disabled={disabled}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg font-medium text-white placeholder:text-white/30 focus:border-[rgb(0,217,163)] focus:outline-none focus:ring-2 focus:ring-[rgb(0,217,163)]/20 disabled:opacity-50"
            autoFocus
          />
        </div>
      )}

      {topic === "user_height" && (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-white/60">Height</label>
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="number"
                value={heightFeet}
                onChange={(e) => setHeightFeet(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    document.getElementById("height-inches")?.focus();
                  }
                }}
                placeholder="6"
                min="4"
                max="7"
                disabled={disabled}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg font-medium text-white placeholder:text-white/30 focus:border-[rgb(0,217,163)] focus:outline-none focus:ring-2 focus:ring-[rgb(0,217,163)]/20 disabled:opacity-50"
                autoFocus
              />
              <span className="mt-1 block text-xs text-white/40">feet</span>
            </div>
            <div className="flex-1">
              <input
                id="height-inches"
                type="number"
                value={heightInches}
                onChange={(e) => setHeightInches(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, true)}
                placeholder="0"
                min="0"
                max="11"
                disabled={disabled}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg font-medium text-white placeholder:text-white/30 focus:border-[rgb(0,217,163)] focus:outline-none focus:ring-2 focus:ring-[rgb(0,217,163)]/20 disabled:opacity-50"
              />
              <span className="mt-1 block text-xs text-white/40">inches</span>
            </div>
          </div>
        </div>
      )}

      {(topic === "user_current_weight" || topic === "user_goal_weight") && (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-white/60">
            {topic === "user_current_weight" ? "Current Weight" : "Goal Weight"} (pounds)
          </label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, true)}
            placeholder="180"
            min="50"
            max="500"
            disabled={disabled}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg font-medium text-white placeholder:text-white/30 focus:border-[rgb(0,217,163)] focus:outline-none focus:ring-2 focus:ring-[rgb(0,217,163)]/20 disabled:opacity-50"
            autoFocus
          />
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!isValid() || disabled}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-[rgb(0,217,163)] to-blue-400 px-6 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-[rgb(0,217,163)]/20 disabled:opacity-40 disabled:hover:shadow-none"
      >
        Continue
      </button>
    </motion.div>
  );
}
