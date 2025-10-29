import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

// Comprehensive quad-focused exercise library
const EXERCISES = [
  // Barbell Squats
  'High-Bar Back Squat',
  'Low-Bar Back Squat',
  'Front Squat',
  'Heel-Elevated Front Squat',
  'Heel-Elevated Back Squat',
  'Paused Back Squat',
  'Paused Front Squat',
  'Tempo Back Squat',
  'Tempo Front Squat',
  'Safety Bar Squat',
  'Cambered Bar Squat',
  'Zombie Squat',

  // Machine Squats
  'Hack Squat',
  'Reverse Hack Squat',
  'Pendulum Squat',
  'V-Squat',
  'Leg Press',
  'Single-Leg Press',
  '45-Degree Leg Press',
  'Horizontal Leg Press',
  'Sissy Squat Machine',

  // Goblet & Bodyweight Squats
  'Goblet Squat',
  'Goblet Box Squat',
  'Cyclist Squat',
  'Sissy Squat',
  'Pistol Squat',
  'Bodyweight Squat',

  // Split Squats & Lunges
  'Bulgarian Split Squat',
  'Rear-Foot Split Squat',
  'Front-Foot Elevated Split Squat',
  'Split Squat',
  'Split Squat Iso Hold',
  'Barbell Split Squat',
  'Dumbbell Split Squat',
  'Goblet Split Squat',
  'Forward Lunge',
  'Reverse Lunge',
  'Walking Lunge',
  'Lateral Lunge',
  'Curtsy Lunge',
  'Deficit Reverse Lunge',

  // Step-Ups & Box Work
  'Step-Up',
  'High Step-Up',
  'Box Step-Up',
  'Lateral Step-Up',
  'Crossover Step-Up',
  'Box Squat',

  // Deadlifts (Quad-Focused)
  'Trap Bar Deadlift (Quad Bias)',
  'Sumo Deadlift',

  // Leg Extensions & Isolation
  'Leg Extension',
  'Single-Leg Extension',
  'Tibialis Raise',

  // Olympic Lifts
  'Front Squat (from Clean)',
  'Squat Clean',
  'Overhead Squat',

  // Specialty & Conditioning
  'Sled Push',
  'Prowler Push',
  'Belt Squat',
  'Hatfield Squat',
  'Anderson Squat',
  'Pin Squat',
  'Wall Sit',
  'Copenhagen Plank',

  // Smith Machine Variations
  'Smith Machine Front Squat',
  'Smith Machine Back Squat',
  'Smith Machine Split Squat',
  'Smith Machine Reverse Lunge',
];

interface LogSetCardProps {
  /** Callback fired when the user saves a set */
  onSaved?: (data: { exercise: string; weight: string }) => void;
  /** Optional initial exercise name */
  initialExercise?: string;
  /** Optional initial weight */
  initialWeight?: string;
}

export default function LogSetCard({
  onSaved,
  initialExercise = "",
  initialWeight = "95",
}: LogSetCardProps) {
  const [exercise, setExercise] = useState(initialExercise);
  const [weight, setWeight] = useState(initialWeight);
  const [saved, setSaved] = useState(false);
  const [showExerciseSuggestions, setShowExerciseSuggestions] = useState(false);
  const [filteredExercises, setFilteredExercises] = useState<string[]>([]);
  const [isTypingWeight, setIsTypingWeight] = useState(false);
  const [weightInput, setWeightInput] = useState(initialWeight);
  const scrollRef = useRef<HTMLDivElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!exercise || !weight) return;
    setSaved(true);

    // Call the parent's onSaved callback
    onSaved?.({ exercise, weight });

    setTimeout(() => setSaved(false), 2000);
  };

  // Handle exercise input change
  const handleExerciseChange = (value: string) => {
    setExercise(value);

    // Show suggestions after 3 characters
    if (value.length >= 3) {
      const query = value.toLowerCase();
      const matches = EXERCISES.filter((ex) =>
        ex.toLowerCase().includes(query)
      );
      setFilteredExercises(matches);
      setShowExerciseSuggestions(matches.length > 0);
    } else {
      setShowExerciseSuggestions(false);
      setFilteredExercises([]);
    }
  };

  // Select exercise from suggestions
  const handleSelectExercise = (selectedExercise: string) => {
    setExercise(selectedExercise);
    setShowExerciseSuggestions(false);
    setFilteredExercises([]);
  };

  // Handle typing in the weight area
  const handleWeightClick = () => {
    setIsTypingWeight(true);
    setTimeout(() => {
      weightInputRef.current?.focus();
      weightInputRef.current?.select();
    }, 0);
  };

  const handleWeightInputChange = (value: string) => {
    setWeightInput(value);
    setWeight(value);
  };

  const handleWeightInputBlur = () => {
    setIsTypingWeight(false);
  };

  const handleWeightInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsTypingWeight(false);
      weightInputRef.current?.blur();
    }
  };

  // Sync scroll position when weight changes
  useEffect(() => {
    const container = scrollRef.current;
    if (container && weight && !isTypingWeight) {
      const numWeight = parseInt(weight);
      if (!isNaN(numWeight) && numWeight >= 5 && numWeight <= 500) {
        const target = container.querySelector(`div[data-value='${numWeight}']`);
        if (target) {
          container.scrollTop = (target as HTMLElement).offsetTop - container.clientHeight / 2 + (target as HTMLElement).clientHeight / 2;
        }
      }
    }
  }, [weight, isTypingWeight]);

  return (
    <Card className="w-full max-w-md p-6 bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 rounded-3xl shadow-xl">
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">Log Your Set</h2>
          <p className="text-sm text-zinc-400">Make your session smarter by tagging the exercise and weight.</p>
        </div>

        {/* Exercise Input with Autocomplete */}
        <div className="space-y-3 relative">
          <label className="text-sm text-zinc-400" htmlFor="exercise">Exercise</label>
          <Input
            id="exercise"
            placeholder="e.g. High-Bar Back Squat"
            className="bg-zinc-800 text-white placeholder-zinc-500 text-base h-12 rounded-xl px-4 border border-zinc-700 focus:ring-2 focus:ring-white"
            value={exercise}
            onChange={(e) => handleExerciseChange(e.target.value)}
            onFocus={() => {
              if (exercise.length >= 3) {
                setShowExerciseSuggestions(filteredExercises.length > 0);
              }
            }}
          />

          {/* Exercise Suggestions Dropdown */}
          {showExerciseSuggestions && filteredExercises.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
              {filteredExercises.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => handleSelectExercise(ex)}
                  className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-700 transition border-b border-zinc-700/50 last:border-none"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Weight Picker with Inline Typing */}
        <div className="space-y-3">
          <label className="text-sm text-zinc-400">Weight (lbs)</label>

          <div className="relative bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
            {/* Typing Mode - Overlay Input */}
            {isTypingWeight && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-900/95 backdrop-blur-sm">
                <Input
                  ref={weightInputRef}
                  type="number"
                  value={weightInput}
                  onChange={(e) => handleWeightInputChange(e.target.value)}
                  onBlur={handleWeightInputBlur}
                  onKeyDown={handleWeightInputKeyDown}
                  className="w-48 text-center bg-zinc-800 text-white text-4xl font-bold h-20 rounded-xl px-4 border-2 border-white focus:ring-0 focus:border-white"
                  placeholder="0"
                />
              </div>
            )}

            {/* Scrollable Weight Picker */}
            <div
              ref={scrollRef}
              className="h-48 overflow-y-scroll scroll-smooth snap-y snap-mandatory text-center rounded-xl cursor-pointer"
              onClick={handleWeightClick}
            >
              {Array.from({ length: 496 }, (_, i) => i + 5).map((val) => (
                <div
                  key={val}
                  data-value={val}
                  className={`h-12 flex items-center justify-center text-2xl font-semibold snap-center transition-all duration-200 ease-out ${
                    parseInt(weight) === val
                      ? "text-white bg-white/10 rounded-xl shadow-md"
                      : "text-zinc-500"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setWeight(val.toString());
                    setWeightInput(val.toString());
                  }}
                >
                  {val} lb
                </div>
              ))}
            </div>
            <div className="absolute top-1/2 left-4 right-4 h-12 border border-zinc-600 rounded-xl pointer-events-none -translate-y-1/2 shadow-inner bg-transparent" />

            {/* Hint text */}
            <p className="text-xs text-zinc-500 text-center mt-3">
              Scroll to select • Tap to type
            </p>
          </div>
        </div>

        <Button
          className="w-full bg-white text-black font-semibold rounded-xl h-12 hover:bg-zinc-100 active:scale-[0.97] transition-transform shadow-md"
          onClick={handleSave}
        >
          Save Set
        </Button>

        {saved && (
          <div className="flex items-center justify-center gap-2 text-green-400 text-sm pt-2 animate-in fade-in slide-in-from-top duration-300">
            <CheckCircle2 size={16} />
            <span>Set logged: {exercise}, {weight} lb</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
