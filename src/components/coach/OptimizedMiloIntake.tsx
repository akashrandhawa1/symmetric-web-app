/**
 * OptimizedMiloIntake Component
 *
 * Redesigned Milo intake with 5-7 questions, smart branching, and modern UI
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ChipSelector, type ChipOption } from "./ChipSelector";
import { RangeSlider } from "./RangeSlider";
import { TagInput } from "./TagInput";
import {
  type OptimizedAnswers,
  type OptimizedTopic,
  getTopicSequence,
  hasMinimumInfo,
  GOAL_OPTIONS,
  EXPERIENCE_OPTIONS,
  EQUIPMENT_OPTIONS,
  COMMON_LIMITATIONS,
  LIMITATION_LABELS,
} from "../../coach/intake/optimizedFlow";

interface OptimizedMiloIntakeProps {
  onComplete: (answers: OptimizedAnswers) => void;
  onCancel?: () => void;
  initialAnswers?: Partial<OptimizedAnswers>;
}

export const OptimizedMiloIntake: React.FC<OptimizedMiloIntakeProps> = ({
  onComplete,
  onCancel,
  initialAnswers = {},
}) => {
  const [answers, setAnswers] = useState<Partial<OptimizedAnswers>>(
    initialAnswers
  );
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);

  // Get dynamic topic sequence based on answers
  const topics = getTopicSequence(answers);
  const currentTopic = topics[currentTopicIndex];
  const progress = ((currentTopicIndex + 1) / topics.length) * 100;

  // Update answer for current topic
  const updateAnswer = <K extends keyof OptimizedAnswers>(
    key: K,
    value: OptimizedAnswers[K]
  ) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  // Navigation
  const canGoNext = () => {
    const answer = answers[currentTopic];
    if (!answer) return false;

    // Validate based on topic type
    switch (currentTopic) {
      case "name":
        return typeof answer === "string" && answer.trim().length > 0;
      case "primary_goal":
        return !!(answer as any)?.type;
      case "training_context":
        return !!(answer as any)?.experience;
      case "equipment_session":
        return (
          (answer as any)?.equipment?.length > 0 && (answer as any)?.minutes > 0
        );
      case "frequency_commitment":
        return (answer as any)?.days_per_week > 0 && (answer as any)?.weeks > 0;
      default:
        return true; // Optional fields
    }
  };

  const goNext = () => {
    if (!canGoNext()) return;

    if (currentTopicIndex < topics.length - 1) {
      setCurrentTopicIndex((i) => i + 1);
    } else if (hasMinimumInfo(answers)) {
      onComplete(answers as OptimizedAnswers);
    }
  };

  const goBack = () => {
    if (currentTopicIndex > 0) {
      setCurrentTopicIndex((i) => i - 1);
    }
  };

  // Render question based on topic
  const renderQuestion = () => {
    switch (currentTopic) {
      case "name":
        return renderNameQuestion();
      case "primary_goal":
        return renderPrimaryGoalQuestion();
      case "training_context":
        return renderTrainingContextQuestion();
      case "limitations":
        return renderLimitationsQuestion();
      case "sport_context":
        return renderSportContextQuestion();
      case "equipment_session":
        return renderEquipmentSessionQuestion();
      case "frequency_commitment":
        return renderFrequencyCommitmentQuestion();
      default:
        return null;
    }
  };

  const renderNameQuestion = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[#E8EDF2]">
        What should I call you?
      </h2>
      <input
        type="text"
        value={(answers.name as string) || ""}
        onChange={(e) => updateAnswer("name", e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && canGoNext() && goNext()}
        placeholder="Your name"
        autoFocus
        className="
          w-full px-4 py-3
          bg-[#1E2530]
          border-2 border-transparent
          rounded-xl
          text-[#E8EDF2] text-lg
          placeholder:text-[rgba(232,237,242,0.4)]
          focus:border-[#00D9A3]
          focus:outline-none
          focus:ring-4 focus:ring-[rgba(0,217,163,0.1)]
          transition-all
        "
      />
    </div>
  );

  const renderPrimaryGoalQuestion = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[#E8EDF2]">
        {answers.name ? `Nice, ${answers.name}! ` : ""}What brings you here
        today?
      </h2>
      <ChipSelector
        options={GOAL_OPTIONS.map((opt) => ({
          id: opt.type,
          icon: opt.icon,
          label: opt.label,
          description: opt.description,
        }))}
        selected={
          answers.primary_goal?.type ? [answers.primary_goal.type] : []
        }
        onSelect={(id) =>
          updateAnswer("primary_goal", {
            type: id as any,
          })
        }
        multiSelect={false}
      />
    </div>
  );

  const renderTrainingContextQuestion = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[#E8EDF2]">
        How experienced are you with strength training?
      </h2>
      <ChipSelector
        options={EXPERIENCE_OPTIONS.map((opt) => ({
          id: opt.level,
          icon: opt.icon,
          label: opt.label,
          detail: opt.detail,
          description: opt.description,
        }))}
        selected={
          answers.training_context?.experience
            ? [answers.training_context.experience]
            : []
        }
        onSelect={(id) =>
          updateAnswer("training_context", {
            experience: id as any,
          })
        }
        multiSelect={false}
      />
      <p className="text-sm text-[rgba(232,237,242,0.6)] flex items-center gap-2">
        <span>💡</span>
        <span>This helps me pick the right exercises and progression</span>
      </p>
    </div>
  );

  const renderLimitationsQuestion = () => {
    const limitationSuggestions = COMMON_LIMITATIONS.map(
      (key) => LIMITATION_LABELS[key] || key
    );

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-[#E8EDF2]">
          Anything I should know about?
        </h2>
        <p className="text-sm text-[rgba(232,237,242,0.7)]">
          Injuries, pain, or limitations
        </p>
        <TagInput
          tags={answers.limitations?.tags || []}
          onChange={(tags) =>
            updateAnswer("limitations", {
              tags,
              details: answers.limitations?.details,
            })
          }
          placeholder="Type and press Enter"
          suggestions={limitationSuggestions}
        />
        <button
          type="button"
          onClick={() => {
            if (!answers.limitations || answers.limitations.tags.length === 0) {
              updateAnswer("limitations", { tags: [] });
              goNext();
            }
          }}
          className="text-sm text-[#00D9A3] hover:underline"
        >
          Nothing to report →
        </button>
      </div>
    );
  };

  const renderSportContextQuestion = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[#E8EDF2]">
        Tell me about your sport
      </h2>
      <input
        type="text"
        value={answers.sport_context?.sport || ""}
        onChange={(e) =>
          updateAnswer("sport_context", {
            sport: e.target.value,
            role: answers.sport_context?.role,
            focus: answers.sport_context?.focus,
          })
        }
        placeholder="e.g., Basketball, Soccer, Running"
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
          transition-all
        "
      />
      <input
        type="text"
        value={answers.sport_context?.focus || ""}
        onChange={(e) =>
          updateAnswer("sport_context", {
            sport: answers.sport_context?.sport || "",
            focus: e.target.value,
          })
        }
        placeholder="What do you want to improve? (e.g., jumping, speed)"
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
          transition-all
        "
      />
    </div>
  );

  const renderEquipmentSessionQuestion = () => {
    const selectedEquipment = answers.equipment_session?.equipment || [];
    const sessionMinutes = answers.equipment_session?.minutes || 30;

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-[#E8EDF2]">
            What equipment do you have today?
          </h2>
          <ChipSelector
            options={EQUIPMENT_OPTIONS.map((opt) => ({
              id: opt.id,
              icon: opt.icon,
              label: opt.label,
            }))}
            selected={selectedEquipment}
            onSelect={(id) => {
              const newEquipment = selectedEquipment.includes(id)
                ? selectedEquipment.filter((e) => e !== id)
                : [...selectedEquipment, id];

              updateAnswer("equipment_session", {
                equipment: newEquipment,
                minutes: sessionMinutes,
              });
            }}
            multiSelect={true}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-[#E8EDF2]">
            How much time per session?
          </h2>
          <RangeSlider
            min={15}
            max={90}
            step={5}
            value={sessionMinutes}
            onChange={(value) =>
              updateAnswer("equipment_session", {
                equipment: selectedEquipment,
                minutes: value,
              })
            }
            suffix=" min"
            marks={[
              { value: 15, label: "15" },
              { value: 30, label: "30" },
              { value: 45, label: "45" },
              { value: 60, label: "60" },
              { value: 90, label: "90" },
            ]}
          />
        </div>
      </div>
    );
  };

  const renderFrequencyCommitmentQuestion = () => {
    const daysPerWeek = answers.frequency_commitment?.days_per_week || 2;
    const weeks = answers.frequency_commitment?.weeks || 8;
    const totalSessions = daysPerWeek * weeks;

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-[#E8EDF2]">
            How often can you train legs?
          </h2>
          <RangeSlider
            min={1}
            max={7}
            step={1}
            value={daysPerWeek}
            onChange={(value) =>
              updateAnswer("frequency_commitment", {
                days_per_week: value,
                weeks,
              })
            }
            label="Days per week"
            suffix=" days"
          />
        </div>

        <div className="space-y-4">
          <RangeSlider
            min={2}
            max={16}
            step={1}
            value={weeks}
            onChange={(value) =>
              updateAnswer("frequency_commitment", {
                days_per_week: daysPerWeek,
                weeks: value,
              })
            }
            label="For how long?"
            suffix=" weeks"
          />
        </div>

        <div className="p-4 bg-[rgba(0,217,163,0.1)] border border-[rgba(0,217,163,0.3)] rounded-xl">
          <p className="text-sm text-[#00D9A3] flex items-center gap-2">
            <span>📊</span>
            <span>
              Total: ~{totalSessions} training session{totalSessions !== 1 ? "s" : ""}
            </span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0E14] via-[#0A0E14] to-[#151922] flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[rgba(232,237,242,0.6)]">
              Step {currentTopicIndex + 1} of {topics.length}
            </span>
            <span className="text-sm text-[rgba(232,237,242,0.6)]">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-[#1E2530] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#00D9A3] to-[#00B088]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Card */}
        <div
          className="
          bg-[#151922]
          border border-[rgba(0,217,163,0.2)]
          rounded-3xl
          p-8
          shadow-[0_0_40px_rgba(0,217,163,0.08)]
        "
        >
          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTopic}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderQuestion()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[rgba(232,237,242,0.1)]">
            <button
              type="button"
              onClick={currentTopicIndex === 0 ? onCancel : goBack}
              className="
                flex items-center gap-2 px-4 py-2
                text-[rgba(232,237,242,0.7)]
                hover:text-[#E8EDF2]
                transition-colors
              "
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{currentTopicIndex === 0 ? "Cancel" : "Back"}</span>
            </button>

            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext()}
              className="
                flex items-center gap-2 px-6 py-3
                bg-gradient-to-r from-[#00D9A3] to-[#00B088]
                text-[#0A0E14] font-semibold
                rounded-xl
                hover:shadow-lg hover:shadow-[rgba(0,217,163,0.3)]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all
              "
            >
              <span>
                {currentTopicIndex === topics.length - 1 ? "Complete" : "Next"}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-center text-sm text-[rgba(232,237,242,0.5)] mt-6">
          Press Enter to continue • Takes about 2 minutes
        </p>
      </motion.div>
    </div>
  );
};
