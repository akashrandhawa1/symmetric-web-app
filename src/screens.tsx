import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BackIcon, HistoryIcon, RepeatIcon, SitUprightIcon, SqueezeIcon, introSlides, onboardingTutorialSteps, InfoIcon } from './constants';
import { HomeHero, ReadinessArc, ReadinessBar, SensorCard, SideCard, TutorialPopUp, RepBarsChart, RecoveryChecklist, StrengthAchievementPopup, TimerBlock, JudgmentChip, CoachMessageCard, TypewriterText } from './components';
import type { ReadinessPrediction, RawPeakHistoryEntry, SensorStatus, SessionHistoryEntry, CompletedSet, RecoveryTask, ChatMessage, CoachHomeFeedback, CoachIntent, StopSuggestion, CoachPrefs, CoachOutput, CoachCta } from './types';
import type { FatigueState } from './lib/fatigue/FatigueDetector';
import type { CoachFinalMessage } from './lib/coach/CoachMessageComposer';
import type { CoachInsightStatus } from './hooks/useCoachInsightPipeline';
import { toDate } from './services';

const QUICK_PROMPT_INTENTS: Record<string, CoachIntent> = {
  'Recover faster?': 'recovery_action',
  'Ready for heavy when?': 'when_to_train',
  'Was fatigue timed right?': 'post_session_analysis',
  'How long to 100%?': 'when_to_train',
  'Light work okay now?': 'session_focus',
  'Next heavy window?': 'plan_next',
  'Today’s focus?': 'session_focus',
  'Rest interval?': 'rest_interval',
  'Warm-up ideas?': 'recovery_action',
  'When is my next session?': 'when_to_train',
  'How’s my trend?': 'trend_explanation',
  'Plan the week?': 'plan_next',
  'Plan the week': 'plan_next',
  'Plan next session': 'plan_next',
};

const formatSuggestionReason = (reason: StopSuggestion['reasons'][number]): string => {
  switch (reason.code) {
    case 'fatigue_high': {
      const threshold = reason.threshold ?? 85;
      const value = reason.value != null ? Math.round(reason.value) : null;
      return value != null
        ? `Fatigue signal high (${value} vs ${threshold})`
        : `Fatigue signal high (over ${threshold})`;
    }
    case 'rep_speed_drop': {
      const value = reason.value != null ? Math.round(reason.value) : null;
      const drop = value != null ? `-${value}%` : `-${reason.threshold ?? 25}%`;
      return `Rep speed declining (${drop} vs set start)`;
    }
    case 'readiness_low': {
      const value = reason.value != null ? Math.round(reason.value) : null;
      return value != null
        ? `Readiness low (today ${value})`
        : `Readiness low (today ${reason.threshold ?? 50})`;
    }
    case 'asymmetry_rising': {
      const value = reason.value != null ? Math.round(reason.value) : null;
      const threshold = reason.threshold != null ? Math.round(reason.threshold) : 10;
      return value != null
        ? `Asymmetry rising (${value}% last 3 reps)`
        : `Asymmetry rising (> ${threshold}% last 3 reps)`;
    }
    case 'signal_unstable':
    default:
      return 'Signal unstable - suggestion may be inaccurate.';
  }
};


interface SplashScreenProps {
  onAnimationComplete: () => void;
}
export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onAnimationComplete, 4000);
    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <div className="h-full w-full bg-transparent flex flex-col items-center justify-center splash-screen">
      <h1 className="splash-title-new text-4xl font-bold tracking-widest text-white/90">
        {'SYMMETRIC'.split('').map((char, index) => (
          <span key={index} style={{ animationDelay: `${0.5 + index * 0.1}s` }}>{char}</span>
        ))}
      </h1>
    </div>
  );
};


interface IntroScreenProps {
  onComplete: () => void;
}
export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const currentSlide = introSlides[slideIndex];
  const handleNext = () => { slideIndex < introSlides.length - 1 ? setSlideIndex(slideIndex + 1) : onComplete(); };

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-950 animate-screen-in">
      <img key={slideIndex} src={currentSlide.imageUrl} alt={currentSlide.headline} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/60"></div>
      <div className="relative h-full flex flex-col p-6 pt-12 text-center text-white">
        <div className="flex-1 flex flex-col items-center justify-end space-y-4 pb-16">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-shadow-lg">{currentSlide.headline}</h1>
            <p className="text-base text-gray-200 max-w-md mx-auto text-shadow-lg leading-relaxed">{currentSlide.subtext}</p>
          </div>
        </div>
        <div className="pb-4 space-y-4">
          <div className="flex justify-center space-x-2">
            {introSlides.map((_, index) => (
              <div key={index} className={`w-2 h-2 rounded-full transition-all ${index === slideIndex ? 'bg-blue-500 scale-125' : 'bg-gray-400'}`} />
            ))}
          </div>
          <button onClick={handleNext} className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">
            {slideIndex === introSlides.length - 1 ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};

interface OnboardingConversationScreenProps {
  onSubmit: (profile: { name: string; age: number; weight: number; height: number }) => void;
  onSkip: () => void;
}

export const OnboardingConversationScreen: React.FC<OnboardingConversationScreenProps> = ({ onSubmit, onSkip }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [step, setStep] = useState(0);
  const steps = [
    {
      label: "Awesome to meet you—what should I call you?",
      placeholder: "Name",
      value: name,
      onChange: (value: string) => setName(value),
      inputMode: 'text' as const,
    },
    {
      label: "Great, and how old are you?",
      placeholder: "Age",
      value: age,
      onChange: (value: string) => setAge(value.replace(/\D/g, '')),
      inputMode: 'numeric' as const,
    },
    {
      label: "Got it. What's your weight right now (in lbs)?",
      placeholder: "Weight",
      value: weight,
      onChange: (value: string) => setWeight(value.replace(/[^0-9.]/g, '')),
      inputMode: 'decimal' as const,
    },
    {
      label: "And your height? (in inches)",
      placeholder: "Height",
      value: height,
      onChange: (value: string) => setHeight(value.replace(/[^0-9.]/g, '')),
      inputMode: 'decimal' as const,
    },
  ];

  const currentStep = steps[step];

  const handleNext = () => {
    const trimmed = currentStep.value.trim();
    if (!trimmed) return;
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      const parsedAge = Number.parseInt(age, 10);
      const parsedWeight = Number.parseFloat(weight);
      const parsedHeight = Number.parseFloat(height);
      onSubmit({ name: name.trim(), age: Number.isFinite(parsedAge) ? parsedAge : 0, weight: Number.isFinite(parsedWeight) ? parsedWeight : 0, height: Number.isFinite(parsedHeight) ? parsedHeight : 0 });
    }
  };

  const handleBack = () => {
    if (step === 0) {
      onSkip();
    } else {
      setStep(step - 1);
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white animate-screen-in">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15)_0%,rgba(15,23,42,0.85)_65%)]" />
      <div className="relative flex h-full flex-col px-6 py-10 gap-8">
        <header className="flex items-center justify-between text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          <button onClick={handleBack} className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/70 hover:border-white/40">
            {step === 0 ? 'Skip' : 'Back'}
          </button>
          <span>{step + 1} / {steps.length}</span>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center gap-10">
          <div className="max-w-md text-center space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-blue-200/70">Coach AI</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white drop-shadow-md">
              {currentStep.label}
            </h2>
          </div>

          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl shadow-[0_28px_60px_rgba(15,23,42,0.4)]">
            <input
              className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-4 text-lg font-semibold text-white placeholder-white/40 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
              placeholder={currentStep.placeholder}
              value={currentStep.value}
              inputMode={currentStep.inputMode}
              onChange={(event) => currentStep.onChange(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleNext()}
              autoFocus
            />
            <p className="mt-4 text-xs text-white/60">This helps me personalize readiness targets and session pacing.</p>
          </div>
        </main>

        <footer className="flex w-full justify-center">
          <button
            onClick={handleNext}
            className="w-full max-w-sm rounded-full bg-blue-500 px-5 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_18px_40px_rgba(59,130,246,0.35)] transition hover:bg-blue-400"
          >
            {step === steps.length - 1 ? "I'm ready" : 'Next'}
          </button>
        </footer>
      </div>
    </div>
  );
};


interface ConnectScreenProps {
  onConnect: (side: 'left' | 'right') => void;
  sensorStatus: SensorStatus;
  onComplete: () => void;
  onBack: () => void;
  sensorError: string | null;
}
export const ConnectScreen: React.FC<ConnectScreenProps> = ({ onConnect, sensorStatus, onComplete, onBack, sensorError }) => {
    const isAnyConnected = sensorStatus.left.status === 'connected' || sensorStatus.right.status === 'connected';

    return (
        <div className="h-full flex flex-col p-6 pt-12 animate-screen-in text-center bg-transparent">
            <div className="flex justify-start">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-300 button-press"><BackIcon/></button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                <h1 className="text-2xl font-bold tracking-tight">Let's pair your sensors</h1>
                <p className="text-gray-400 max-w-sm">Press the button on your sensor, then tap its icon to connect.</p>
                <div className="grid grid-cols-2 gap-4 w-full">
                    <SensorCard side="Left" status={sensorStatus.left.status} onConnect={() => onConnect('left')} />
                    <SensorCard side="Right" status={sensorStatus.right.status} onConnect={() => onConnect('right')} />
                </div>
                <div className="text-center text-gray-400 h-10">
                    {sensorError && <p className="text-red-400 text-sm mt-1">{sensorError}</p>}
                </div>
            </div>
            <div className="pb-4">
                <button onClick={onComplete} disabled={!isAnyConnected} className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg disabled:bg-gray-800 disabled:text-gray-500 disabled:shadow-none hover:bg-blue-700 transition-all shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">
                    Next: Strap Sensors
                </button>
            </div>
        </div>
    );
};

interface PlacementGuideScreenProps {
  onComplete: () => void;
  onBack: () => void;
}
export const PlacementGuideScreen: React.FC<PlacementGuideScreenProps> = ({ onComplete, onBack }) => {
    return (
        <div className="h-full relative flex flex-col animate-screen-in bg-black text-white overflow-hidden">
             <img 
                src="https://i.postimg.cc/90tbv23q/20250603-1448-Sleek-EMG-Sensor-simple-compose-01jwvhx5rfe25arnkmphjynbxh.png" 
                alt="Sensor placement on quadriceps" 
                className="absolute top-0 left-0 w-full h-full object-cover z-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-transparent z-10"></div>
            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-gray-950/60 to-transparent z-10"></div>
            
            <div className="relative z-20 h-full flex flex-col p-6">
                <div className="pt-6 flex items-center flex-shrink-0">
                    <button onClick={onBack} className="p-2 -ml-2 text-white button-press z-10"><BackIcon /></button>
                    <h1 className="text-2xl font-bold tracking-tight text-center w-full -ml-8 text-shadow-lg">Sensor Placement</h1>
                </div>

                <div className="flex-1"></div>

                <div className="flex-shrink-0 space-y-4 pb-4">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold text-white text-shadow-lg">Center of the Quadriceps</h2>
                        <p className="text-base text-gray-200 mt-1 leading-relaxed text-shadow-lg">Place the sensor halfway between your hip and knee for the most accurate reading.</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 border border-white/20 backdrop-blur-sm text-left space-y-2 w-full">
                        <h3 className="text-sm font-semibold text-white">Key Points</h3>
                        <ul className="list-disc list-inside text-sm text-gray-200 space-y-1">
                            <li>Make direct contact with the skin.</li>
                            <li>Secure firmly with the strap.</li>
                            <li>Align vertically with the muscle fibers.</li>
                        </ul>
                    </div>
                    <button onClick={onComplete} className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">
                        Next: Peak Strength Test
                    </button>
                </div>
            </div>
        </div>
    );
};


interface MVCScreenProps {
    onBegin: () => void;
    onBack: () => void;
}
export const MVCScreen: React.FC<MVCScreenProps> = ({ onBegin, onBack }) => {
    return (
        <div className="h-full relative flex flex-col animate-screen-in bg-black text-white overflow-hidden">
            <video 
                src="https://ia801002.us.archive.org/18/items/untitled_20250912_2248/Untitled.mp4" 
                autoPlay 
                loop 
                muted 
                playsInline
                className="absolute top-0 left-0 w-full h-full object-cover z-0"
            ></video>
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/70 to-transparent z-10"></div>
            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-gray-950/60 to-transparent z-10"></div>
            <div className="relative z-20 h-full flex flex-col p-6">
                <div className="pt-6 flex items-center flex-shrink-0">
                    <button onClick={onBack} className="p-2 -ml-2 text-white button-press z-10"><BackIcon /></button>
                    <h1 className="text-2xl font-bold tracking-tight text-center w-full -ml-8 text-shadow-lg">Peak Strength Test</h1>
                </div>
                <div className="w-full grid grid-cols-3 gap-3 text-center py-6 flex-shrink-0">
                    <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col items-center justify-center aspect-square">
                        <SitUprightIcon className="w-8 h-8 text-white/90 mb-1"/>
                        <p className="text-xs font-semibold leading-tight text-shadow-lg">Sit Upright</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col items-center justify-center aspect-square">
                        <SqueezeIcon className="w-8 h-8 text-white/90 mb-1"/>
                        <p className="text-xs font-semibold leading-tight text-shadow-lg">Max Squeeze</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm flex flex-col items-center justify-center aspect-square">
                        <RepeatIcon className="w-8 h-8 text-white/90 mb-1"/>
                        <p className="text-xs font-semibold leading-tight text-shadow-lg">3x Per Leg</p>
                    </div>
                </div>
                <div className="flex-1"></div>
                <div className="flex-shrink-0 space-y-4 pb-4">
                    <div className="w-full bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-center backdrop-blur-sm">
                        <p className="text-sm text-amber-300 font-medium">For best results, test only when you feel fresh.</p>
                    </div>
                    <button onClick={onBegin} className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">
                        Begin Test
                    </button>
                </div>
            </div>
        </div>
    );
};

interface SetupScreenProps {
    onBack: () => void;
    repsPerSide: number;
    onBegin: () => void;
    onStartWorkoutDirectly: () => void;
}
export const SetupScreen: React.FC<SetupScreenProps> = ({ onBack, repsPerSide, onBegin, onStartWorkoutDirectly }) => {
  return (
    <div className="h-full flex flex-col animate-screen-in p-6">
      <div className="pt-6"><button onClick={onBack} className="text-gray-400 hover:text-white transition-colors p-2 -ml-2 button-press"><BackIcon /></button></div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center space-y-8 w-full">
          <div className="space-y-2"> <h2 className="text-3xl font-bold">Readiness Check</h2> <p className="text-base text-gray-300">Perform {repsPerSide} max squeezes per leg.</p> </div>
          <div className="text-5xl">💪</div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-left space-y-2 backdrop-blur-sm">
            <h3 className="text-sm font-medium text-white">Instructions</h3>
            <ol className="list-decimal list-inside text-sm text-gray-300 space-y-1">
              <li>Sit comfortably, sensor on your thigh.</li> <li>Extend one leg and squeeze as hard as you can.</li> <li>Relax, then repeat for the other leg.</li>
            </ol>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={onBegin} className="w-full bg-blue-600 text-white py-4 text-lg font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">Begin Check</button>
            <button onClick={onStartWorkoutDirectly} className="w-full bg-white/10 text-white py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-colors button-press">
              Start Workout Directly
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TestingScreenProps {
    onCancel: () => void;
    leftDone: number;
    rightDone: number;
    repsPerSide: number;
    isComplete: boolean;
    isAnalyzing: boolean;
    onSimulateSqueeze: (side: 'left' | 'right') => void;
    sensorStatus: SensorStatus;
}
export const TestingScreen: React.FC<TestingScreenProps> = ({ onCancel, leftDone, rightDone, repsPerSide, isComplete, isAnalyzing, onSimulateSqueeze, sensorStatus }) => {
    const isLeftActive = sensorStatus.left.status === 'connected';
    const isRightActive = sensorStatus.right.status === 'connected';
    const showAnalyzing = isComplete || isAnalyzing;

    let promptText = "Squeeze as hard as you can!";
    if (isLeftActive && leftDone < repsPerSide) { promptText = "Squeeze Left Leg"; }
    else if (isRightActive && rightDone < repsPerSide) { promptText = "Squeeze Right Leg"; }
    else if (isLeftActive || isRightActive) { promptText = "All reps recorded!"; }

    return (
        <div className="h-full flex flex-col animate-screen-in p-4">
            <div className="pt-8">
                <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">Cancel</button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center relative">
                {showAnalyzing ? (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 mx-auto bg-emerald-900/40 rounded-full flex items-center justify-center border-2 border-emerald-500/50">
                            <span className="text-3xl">{isComplete ? '✓' : '⏳'}</span>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-light">{isComplete ? 'Check Complete!' : 'Analyzing Readiness…'}</h3>
                            <p className="text-gray-400 text-sm">Hang tight, crunching the numbers.</p>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
                        <div className="text-center space-y-2"> <h3 className="text-xl font-semibold">{promptText}</h3> <p className="text-sm text-gray-400">Give it your maximum effort!</p> </div>
                        <div className="w-full flex-1 flex items-center justify-center gap-4">
                            {isLeftActive && <SideCard label="Left" color="blue" done={leftDone} total={repsPerSide} onSimulateSqueeze={() => onSimulateSqueeze('left')} />}
                            {isRightActive && <SideCard label="Right" color="emerald" done={rightDone} total={repsPerSide} onSimulateSqueeze={() => onSimulateSqueeze('right')} />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface PreTrainingScreenProps {
    score: number | null;
    rec: { message: string } | null;
    onStart: () => void;
    onEndSession: () => void;
    getReadinessData: (score: number | null) => { color: string; word: string };
}
export const PreTrainingScreen: React.FC<PreTrainingScreenProps> = ({ score, rec, onStart, onEndSession, getReadinessData }) => {
    const data = getReadinessData(score);
    return (
        <div className="h-full flex flex-col p-4 animate-screen-in">
            <div className="pt-8 px-2"><button onClick={onEndSession} className="text-gray-400 hover:text-white transition-colors p-2 -ml-2 button-press"><BackIcon /></button></div>
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-center">
                <ReadinessArc score={score || 0} color={data.color} />
                <div className="space-y-1"> <h2 className="text-xl font-medium" style={{ color: data.color }}>Ready to Train</h2> <p className="text-sm text-amber-300/90">{rec && rec.message}</p> </div>
            </div>
            <div className="w-full pb-4"> <button onClick={onStart} className="w-full bg-blue-600 text-white py-4 text-lg font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">Start Workout</button> </div>
        </div>
    );
};

interface TrainingScreenProps {
    onEnd: () => void;
    onSimulateRep: (peak: number) => void;
    sessionData: ReadinessPrediction | null;
    onEndSet: () => void;
    onboardStep: number;
    onSetOnboardStep: (step: number) => void;
    sessionPhase: 'active' | 'set-summary' | 'end';
    onDismissTutorial: () => void;
    restDuration: number;
    onResumeSet: () => void;
    recoveryDirective: string;
    preSetReadiness: number | null;
    completedSetsCount: number;
    getReadinessData: (score: number | null) => { color: string; word: string };
    isCalibrationSet: boolean;
    stopSuggestion: StopSuggestion | null;
    suggestionKey: string | null;
    onContinueSuggestion: (key: string) => void;
    onAcceptSuggestion: (key: string) => void;
    onSkipSet: () => void;
    onSkipExercise: () => void;
    onToggleSuppressStops: (on: boolean) => void;
    coachPrefs: CoachPrefs;
    awaitingEndSetConfirm: boolean;
    undoInfo: { label: string } | null;
    onUndo: () => void;
    restSummary: { preReadiness: number | null; postReadiness: number | null; weightAdjustmentMessage: string | null; nextWeightAdjustment: number | null; fatigueLimited: boolean } | null;
    coachOutput: CoachOutput | null;
    coachMessage: CoachFinalMessage | null;
    coachMessageStatus: CoachInsightStatus;
}
interface TrainingScreenProps {
    onEnd: () => void;
    onSimulateRep: (peak: number) => void;
    sessionData: ReadinessPrediction | null;
    onEndSet: () => void;
    onboardStep: number;
    onSetOnboardStep: (step: number) => void;
    sessionPhase: 'active' | 'set-summary' | 'end';
    onDismissTutorial: () => void;
    restDuration: number;
    onResumeSet: () => void;
    recoveryDirective: string;
    preSetReadiness: number | null;
    completedSetsCount: number;
    getReadinessData: (score: number | null) => { color: string; word: string };
    isCalibrationSet: boolean;
    stopSuggestion: StopSuggestion | null;
    suggestionKey: string | null;
    onContinueSuggestion: (key: string) => void;
    onAcceptSuggestion: (key: string) => void;
    onSkipSet: () => void;
    onSkipExercise: () => void;
    onToggleSuppressStops: (on: boolean) => void;
    coachPrefs: CoachPrefs;
    undoInfo: { label: string } | null;
    onUndo: () => void;
    restSummary: { preReadiness: number | null; postReadiness: number | null; weightAdjustmentMessage: string | null; nextWeightAdjustment: number | null; fatigueLimited: boolean } | null;
    coachOutput: CoachOutput | null;
    coachMessage: CoachFinalMessage | null;
    coachMessageStatus: CoachInsightStatus;
    onCoachContinue: () => void;
    onCoachEnd: () => void;
}
export const TrainingScreen: React.FC<TrainingScreenProps> = ({
    onEnd, onSimulateRep, sessionData, onEndSet, sessionPhase, onboardStep, onSetOnboardStep, 
    onDismissTutorial, restDuration, onResumeSet, recoveryDirective,
    preSetReadiness, completedSetsCount, getReadinessData, isCalibrationSet,
    stopSuggestion, suggestionKey, onContinueSuggestion, onAcceptSuggestion,
    onSkipSet, onSkipExercise, onToggleSuppressStops, coachPrefs,
 undoInfo, onUndo,
    restSummary, coachOutput, coachMessage, coachMessageStatus,
    onCoachContinue, onCoachEnd,
}) => {    const isFatigued = sessionData?.fatigueDetected || false;
    const preventAutoResume = Boolean(stopSuggestion);
    const suggestionReasons = useMemo(() => (stopSuggestion ? stopSuggestion.reasons.slice(0, 2).map(formatSuggestionReason) : []), [stopSuggestion]);
    const suggestionHeadline = stopSuggestion?.target === 'exercise' ? 'Coach suggests stopping this exercise' : 'Coach suggests stopping this set';
    const suggestionPrimaryLabel = stopSuggestion?.target === 'exercise' ? 'End exercise' : 'End set';
    const showCoachSkeleton = coachMessageStatus === 'skeleton';
    const showCoachMessage = coachMessageStatus === 'ready' && Boolean(coachMessage);
    const [isCoachMessageVisible, setIsCoachMessageVisible] = useState(false);

    const [showSuggestionBanner, setShowSuggestionBanner] = useState(Boolean(stopSuggestion));
    const [showSuggestionReasons, setShowSuggestionReasons] = useState(false);
    const [showOverflowMenu, setShowOverflowMenu] = useState(false);
    const bannerTimerRef = useRef<number | null>(null);

    const [restSecondsLeft, setRestSecondsLeft] = useState(restDuration);
    const totalSetsPlanned = Math.max(completedSetsCount + 1, 4);
    const timerJudgment = coachOutput?.judgment ?? 'neutral';
    const timerSubLabel = coachOutput?.timerSubLabel ?? null;
    const planKind = coachOutput?.plan ?? null;
    const coachCardMessage = coachOutput?.message ?? null;
    const primaryCta = coachOutput?.ctas?.find(cta => cta.emphasis === 'primary') ?? null;
    const secondaryCtas = useMemo(
        () => (coachOutput?.ctas ?? []).filter(cta => cta.emphasis === 'secondary'),
        [coachOutput],
    );
    const [showFatigueAlert, setShowFatigueAlert] = useState(false);
    const prevIsFatigued = useRef(isFatigued);
    const [animatedScore, setAnimatedScore] = useState(preSetReadiness ?? 100);
    const [animationStage, setAnimationStage] = useState<'hidden' | 'arc' | 'line' | 'rest'>('hidden');
    const prevPhaseRef = useRef(sessionPhase);
    const lastRestSignatureRef = useRef<string | null>(null);
    const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearRestInterval = useCallback(() => {
        if (restIntervalRef.current) {
            clearInterval(restIntervalRef.current);
            restIntervalRef.current = null;
        }
    }, []);

    const startRestCountdown = useCallback((initialSeconds: number) => {
        clearRestInterval();
        const initial = Math.max(0, Math.round(initialSeconds || 0));
        setRestSecondsLeft(initial);
        if (initial <= 0) {
            if (!preventAutoResume) {
                onResumeSet();
            }
            return;
        }
        restIntervalRef.current = window.setInterval(() => {
            setRestSecondsLeft(prev => {
                if (prev <= 1) {
                    clearRestInterval();
                    if (!preventAutoResume) {
                        onResumeSet();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [clearRestInterval, preventAutoResume, onResumeSet]);

    useEffect(() => {
        if (isFatigued && !prevIsFatigued.current) {
            setShowFatigueAlert(true);
            const timer = setTimeout(() => {
                setShowFatigueAlert(false);
            }, 4000); // show for 4 seconds
            return () => clearTimeout(timer);
        }
        prevIsFatigued.current = isFatigued;
    }, [isFatigued]);

    useEffect(() => {
        if (coachMessageStatus === 'ready' && coachMessage) {
            let raf: number | null = null;
            if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
                setIsCoachMessageVisible(false);
                raf = window.requestAnimationFrame(() => setIsCoachMessageVisible(true));
            } else {
                setIsCoachMessageVisible(true);
            }
            return () => {
                if (raf !== null && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
                    window.cancelAnimationFrame(raf);
                }
                setIsCoachMessageVisible(false);
            };
        }
        setIsCoachMessageVisible(false);
        return undefined;
    }, [coachMessageStatus, coachMessage?.id]);

    useEffect(() => {
        if (bannerTimerRef.current) {
            window.clearTimeout(bannerTimerRef.current);
            bannerTimerRef.current = null;
        }
        if (!stopSuggestion || !suggestionKey) {
            setShowSuggestionBanner(false);
            setShowSuggestionReasons(false);
            setShowOverflowMenu(false);
            return;
        }
        setShowSuggestionBanner(true);
        setShowSuggestionReasons(false);
        setShowOverflowMenu(false);
        bannerTimerRef.current = window.setTimeout(() => {
            setShowSuggestionBanner(false);
        }, 6500);
        return () => {
            if (bannerTimerRef.current) {
                window.clearTimeout(bannerTimerRef.current);
                bannerTimerRef.current = null;
            }
        };
    }, [stopSuggestion, suggestionKey]);

    useEffect(() => {
        if (showSuggestionReasons && bannerTimerRef.current) {
            window.clearTimeout(bannerTimerRef.current);
            bannerTimerRef.current = null;
        }
    }, [showSuggestionReasons]);

    const memoisedRestSummary = useMemo(() => restSummary ?? {
        preReadiness: preSetReadiness ?? sessionData?.currentReadiness ?? 0,
        postReadiness: sessionData?.currentReadiness ?? 0,
        weightAdjustmentMessage: sessionData?.weightAdjustmentMessage ?? null,
        nextWeightAdjustment: sessionData?.nextSetWeightAdjustment ?? null,
        fatigueLimited: false,
    }, [restSummary, preSetReadiness, sessionData?.currentReadiness, sessionData?.weightAdjustmentMessage, sessionData?.nextSetWeightAdjustment]);

    useEffect(() => {
        const previousPhase = prevPhaseRef.current;
        prevPhaseRef.current = sessionPhase;

        const enteringSetSummary = sessionPhase === 'set-summary' && previousPhase !== 'set-summary';
        let stage1Timer: ReturnType<typeof setTimeout> | null = null;
        let stage2Timer: ReturnType<typeof setTimeout> | null = null;
        let stage3Timer: ReturnType<typeof setTimeout> | null = null;
        const preScore = memoisedRestSummary.preReadiness ?? preSetReadiness ?? 100;
        const postScore = memoisedRestSummary.postReadiness ?? preScore;

        const summarySignature = `${preScore}|${postScore}`;
        const summaryChanged = summarySignature !== lastRestSignatureRef.current;
        if (sessionPhase === 'set-summary' && summaryChanged) {
            lastRestSignatureRef.current = summarySignature;
        }

        const shouldKickoff = sessionPhase === 'set-summary' && (enteringSetSummary || animationStage === 'hidden' || summaryChanged);

        if (shouldKickoff) {
            setAnimationStage('arc');
            setAnimatedScore(preScore);
            setRestSecondsLeft(Math.max(0, Math.round(restDuration || 0)));

            stage1Timer = setTimeout(() => {
                setAnimatedScore(postScore);
            }, 100);

            stage2Timer = setTimeout(() => {
                setAnimationStage('line');
            }, 2000);

            stage3Timer = setTimeout(() => {
                setAnimationStage('rest');
            }, 2600);
        } else if (sessionPhase !== 'set-summary') {
            setAnimationStage('hidden');
            clearRestInterval();
        }

        return () => {
            if (stage1Timer) clearTimeout(stage1Timer);
            if (stage2Timer) clearTimeout(stage2Timer);
            if (stage3Timer) clearTimeout(stage3Timer);
            clearRestInterval();
        };
    }, [sessionPhase, restDuration, preventAutoResume, onResumeSet, preSetReadiness, memoisedRestSummary.preReadiness, memoisedRestSummary.postReadiness, clearRestInterval]);

    useEffect(() => {
        if (animationStage === 'rest') {
            startRestCountdown(restDuration);
            return () => {
                clearRestInterval();
            };
        }
        return () => undefined;
    }, [animationStage, restDuration, startRestCountdown, clearRestInterval]);
    
    const handleTutorialNext = useCallback(() => {
        const nextStep = onboardStep + 1;
        if (nextStep > onboardingTutorialSteps.length) {
            onSetOnboardStep(99);
            onDismissTutorial();
        } else {
            onSetOnboardStep(nextStep);
        }
    }, [onboardStep, onSetOnboardStep, onDismissTutorial]);

    const handleAcceptClick = useCallback(() => {
        if (suggestionKey) {
            onAcceptSuggestion(suggestionKey);
        }
    }, [suggestionKey, onAcceptSuggestion]);

    const handleContinueClick = useCallback(() => {
        if (suggestionKey) {
            onContinueSuggestion(suggestionKey);
            setShowSuggestionBanner(false);
        }
    }, [suggestionKey, onContinueSuggestion]);

    const handleCoachCta = useCallback((cta: CoachCta) => {
        if (cta.action === 'end_session') {
            onEnd();
            return;
        }
        onResumeSet();
    }, [onEnd, onResumeSet]);

    const handleSkipSetClick = useCallback(() => {
        setShowOverflowMenu(false);
        onSkipSet();
    }, [onSkipSet]);

    const handleSkipExerciseClick = useCallback(() => {
        setShowOverflowMenu(false);
        onSkipExercise();
    }, [onSkipExercise]);

    const handleToggleSuppressClick = useCallback(() => {
        setShowOverflowMenu(false);
        onToggleSuppressStops(!coachPrefs.suppressStopsForSession);
    }, [onToggleSuppressStops, coachPrefs.suppressStopsForSession]);

    const renderPostSetScreen = () => {
        const preScore = memoisedRestSummary.preReadiness ?? preSetReadiness ?? 0;
        const finalReadiness = memoisedRestSummary.postReadiness ?? preScore;
        const readinessData = getReadinessData(finalReadiness);
        const animatedReadinessData = getReadinessData(animatedScore);
        
        return (
            <div className={`post-set-screen ${animationStage !== 'hidden' ? 'visible' : ''}`}>
                <div className={`post-set-arc-container ${animationStage === 'line' || animationStage === 'rest' ? 'morphed' : ''}`}>
                    <div className={`arc-wrapper ${animationStage !== 'arc' ? 'hidden' : ''}`}>
                        <ReadinessArc 
                            score={animatedScore}
                            color={animatedReadinessData.color}
                            size={220}
                        />
                    </div>
                    <div className={`line-wrapper ${animationStage === 'line' || animationStage === 'rest' ? 'visible' : ''}`}>
                         <div className="flex-grow">
                             <ReadinessBar 
                                 preSetScore={preScore} 
                                 postSetScore={finalReadiness} 
                                 color={readinessData.color}
                             />
                         </div>
                         <span className="font-semibold text-gray-300">{Math.round(finalReadiness)}% Readiness</span>
                    </div>
                </div>

                <div className={`resting-content-container ${animationStage === 'rest' ? 'visible' : ''}`}>
                    <div className="flex flex-col items-center justify-center">
                        <span className="text-5xl font-black tracking-tight">{`${String(Math.floor(restSecondsLeft/60)).padStart(2,'0')}:${String(restSecondsLeft%60).padStart(2,'0')}`}</span>
                        <span className="text-sm text-white/60 -mt-1">Resting...</span>
                    </div>
                    {coachMessageStatus === 'ready' && coachMessage && (
                        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/95 px-5 py-4 text-left shadow-2xl backdrop-blur-lg transition-opacity duration-200">
                            <p className="text-sm font-semibold text-white">{coachMessage.headline}</p>
                            {coachMessage.subline && (
                                <p className="mt-1 text-sm text-white/70">{coachMessage.subline}</p>
                            )}
                            {coachMessage.tip && (
                                <p className="mt-2 text-xs text-white/60">{coachMessage.tip}</p>
                            )}
                        </div>
                    )}
                    <div className="w-full max-w-sm space-y-3">
                        <button
                            type="button"
                            onClick={() => (primaryCta ? handleCoachCta(primaryCta) : onResumeSet())}
                            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-400 button-press"
                        >
                            {primaryCta?.label ?? 'Start Next Set'}
                        </button>
                        {secondaryCtas.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-3">
                                {secondaryCtas.map((cta) => (
                                    <button
                                        key={cta.id}
                                        type="button"
                                        onClick={() => handleCoachCta(cta)}
                                        className="text-xs font-semibold text-white/70 underline-offset-2 transition hover:underline button-press"
                                    >
                                        {cta.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={onEnd}
                            className="w-full rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/16 button-press"
                        >
                            End Session
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative flex h-full w-full flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white transition-all duration-1000 ${isFatigued ? 'fatigue-glow-bg' : ''}`}>
            {onboardStep < 99 && <TutorialPopUp step={onboardStep} onNext={handleTutorialNext} onSkip={onDismissTutorial} steps={onboardingTutorialSteps} />}

            {sessionPhase !== 'set-summary' && (showCoachSkeleton || showCoachMessage) && (
                <div className="fixed top-4 left-1/2 z-40 w-[min(420px,calc(100%-32px))] -translate-x-1/2" aria-live="polite">
                    {showCoachSkeleton && (
                        <div className="rounded-3xl border border-white/10 bg-slate-900/90 px-5 py-4 shadow-2xl backdrop-blur-md">
                            <div className="h-3 w-24 rounded-full bg-white/10 animate-pulse" />
                            <div className="mt-3 h-3 w-3/4 rounded-full bg-white/5 animate-pulse" />
                        </div>
                    )}
                    {showCoachMessage && coachMessage && (
                        <div
                            key={coachMessage.id}
                            className={`rounded-3xl border border-white/10 bg-slate-900/95 px-5 py-4 shadow-2xl backdrop-blur-lg transition-opacity duration-200 ${isCoachMessageVisible ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <p className="text-sm font-semibold text-white">{coachMessage.headline}</p>
                            {coachMessage.subline && (
                                <p className="mt-1 text-sm text-white/70">{coachMessage.subline}</p>
                            )}
                            {coachMessage.tip && (
                                <p className="mt-2 text-xs text-white/60">{coachMessage.tip}</p>
                            )}
                            {coachMessage.actions.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {coachMessage.actions.includes('continue_anyway') && (
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onCoachContinue();
                                            }}
                                            className="flex-1 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/60 hover:text-white"
                                        >
                                            Continue anyway
                                        </button>
                                    )}
                                    {coachMessage.actions.includes('end_set') && (
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onCoachEnd();
                                            }}
                                            className="flex-1 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300"
                                        >
                                            End set
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            
            {stopSuggestion && suggestionKey && showSuggestionBanner && (
                <div className="fixed top-6 left-1/2 z-40 w-[min(420px,calc(100%-32px))] -translate-x-1/2" aria-live="polite" role="status">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/95 px-5 py-4 shadow-2xl">
                        <div className="flex items-start gap-3">
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-white">{suggestionHeadline}</p>
                                {suggestionReasons[0] && (
                                    <p className="mt-1 text-xs text-white/70">{suggestionReasons[0]}</p>
                                )}
                                {showSuggestionReasons && (
                                    <ul className="mt-2 space-y-1 text-xs text-white/70">
                                        {suggestionReasons.map((reason, index) => (
                                            <li key={`${reason}-${index}`} className="flex items-start gap-2">
                                                <span className="mt-[3px] h-[4px] w-[4px] rounded-full bg-white/60"></span>
                                                <span>{reason}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <button type="button" onClick={onEnd} className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-400 button-press">
                                        End session
                                    </button>
                                    <button type="button" onClick={handleContinueClick} className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/20 button-press">
                                        Continue anyway
                                    </button>
                                    <button type="button" onClick={() => setShowSuggestionReasons(prev => !prev)} className="text-xs font-semibold text-white/70 underline-offset-2 transition hover:underline" aria-expanded={showSuggestionReasons}>
                                        Why?
                                    </button>
                                </div>
                            </div>
                            <div className="relative">
                                <button type="button" className="p-2 text-white/60 transition hover:text-white" aria-haspopup="true" aria-expanded={showOverflowMenu} onClick={() => setShowOverflowMenu(prev => !prev)}>
                                    ...
                                </button>
                                {showOverflowMenu && (
                                    <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-xl">
                                        <button type="button" onClick={handleSkipSetClick} className="w-full rounded-lg px-3 py-2 text-left text-xs text-white/80 transition hover:bg-white/10 button-press">
                                            Skip set
                                        </button>
                                        <button type="button" onClick={handleSkipExerciseClick} className="w-full rounded-lg px-3 py-2 text-left text-xs text-white/80 transition hover:bg-white/10 button-press">
                                            Skip exercise
                                        </button>
                                        <button type="button" onClick={handleToggleSuppressClick} className="w-full rounded-lg px-3 py-2 text-left text-xs text-white/80 transition hover:bg-white/10 button-press">
                                            {coachPrefs.suppressStopsForSession ? 'Allow stop suggestions today' : "Don't suggest stops again today"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {renderPostSetScreen()}

            

            {undoInfo && (
                <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
                    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/95 px-4 py-2 shadow-2xl">
                        <span className="text-sm text-white/80">{undoInfo.label}</span>
                        <button type="button" onClick={onUndo} className="text-sm font-semibold text-emerald-300 transition hover:text-emerald-200 button-press">
                            Undo
                        </button>
                    </div>
                </div>
            )}

            <div className={`flex-1 flex flex-col transition-opacity duration-300 ${sessionPhase === 'set-summary' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {isCalibrationSet && (sessionData?.reps?.length || 0) === 0 && sessionPhase === 'active' && (
                    <div className="absolute inset-x-0 top-1/4 z-10 p-6 animate-screen-in">
                        <div className="bg-blue-900/50 border border-blue-500 rounded-2xl p-4 text-center backdrop-blur-sm space-y-2 shadow-lg">
                            <h3 className="text-lg font-bold text-blue-300">
                                Calibration Set
                            </h3>
                            <p className="text-white/90 text-base leading-relaxed">
                                We’re going to do 5 reps. The goal is to hit peak fatigue by the fifth rep.
                            </p>
                        </div>
                    </div>
                )}

                <div className={`flex-1 flex flex-col transition-opacity duration-500 ${isCalibrationSet && (sessionData?.reps?.length || 0) === 0 ? 'opacity-30' : 'opacity-100'}`}>
                    <div 
                        className="flex-grow relative py-6 md:py-10 chart-container"
                        onClick={() => {
                            const demonstrateAdvancedFatigue = completedSetsCount === 1; 
                            const currentRepsInSet = sessionData?.reps?.length || 0;
                            let peak;

                            if (demonstrateAdvancedFatigue) {
                                // Pattern: Initial high, compensatory spike, then sharp drop-off
                                switch (currentRepsInSet) {
                                    case 0: peak = 95; break; // Rep 1: Strong start
                                    case 1: peak = 98; break; // Rep 2: Compensatory spike
                                    case 2: peak = 85; break; // Rep 3: Fatigue sets in
                                    case 3: peak = 72; break; // Rep 4: Significant drop
                                    default: peak = 60; break; // Rep 5+: Maintaining through fatigue
                                }
                            } else {
                                // Normal pattern: Gradual, linear fatigue
                                peak = 96 - (currentRepsInSet * 8);
                            }
                            
                            // Add a bit of randomness and ensure it's within a reasonable range
                            onSimulateRep(Math.max(40, Math.min(100, peak + Math.random() * 4 - 2)));
                        }}
                        role="button"
                        aria-label="Simulate one repetition"
                    >
                        <RepBarsChart 
                            reps={sessionData?.reps || []}
                            fatigueAtRep={sessionData?.fatigueDetectedAtRep || null}
                            targetRep={5}
                        />
                        {(sessionData?.reps?.length || 0) === 0 && !isCalibrationSet && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <p className="text-lg text-white/70 bg-black/50 px-4 py-2 rounded-lg animate-screen-in">Tap anywhere to start the set</p>
                            </div>
                        )}
                    </div>
                </div>
            
                <div className="mt-auto w-full rounded-t-3xl bg-slate-900/80 p-6 shadow-[0_-8px_35px_rgba(15,23,42,0.55)] backdrop-blur footer-section space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={onEndSet} className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.35)] transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 button-press">
                            End Set
                        </button>
                        <button
                            onClick={onEnd}
                            className="flex-1 rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white/90 button-press"
                        >
                            End Session
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

interface ImpactScreenProps {
    readinessScore: number | null;
    postScore: number | null;
    getReadinessData: (score: number | null) => { color: string, word: string };
    onRetest: () => void;
    onPlanNext: () => void;
    workoutSummary: string;
}
export const ImpactScreen: React.FC<ImpactScreenProps> = ({ readinessScore, postScore, getReadinessData, onRetest, onPlanNext, workoutSummary }) => {
    const animatedScore = postScore ?? readinessScore ?? 0;
    
    return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-screen-in space-y-6">
            <h2 className="text-3xl font-bold">Workout Complete!</h2>
            <div className="py-4 flex flex-col items-center space-y-2">
                <div className="text-base font-medium text-gray-300">Post-Workout Readiness</div>
                <ReadinessArc score={animatedScore} color={getReadinessData(animatedScore).color} size={220} />
            </div>
            <p className="text-gray-300 max-w-xs text-base leading-relaxed">{workoutSummary}</p>
            <div className="w-full space-y-3 pt-6">
                <button onClick={onPlanNext} className="w-full bg-blue-600 text-white py-4 text-lg rounded-2xl font-semibold hover:bg-blue-700 transition-colors shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] button-press">View Coach's Analysis</button>
                <button onClick={onRetest} className="w-full bg-white/10 text-white py-4 rounded-2xl text-lg button-press">Retest Readiness</button>
            </div>
        </div>
    );
};

export { HomeScreen } from './screens/HomeScreen';
export type { HomeScreenProps } from './screens/HomeScreen';

export const ChatScreen: React.FC<{
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string, intent?: CoachIntent) => void;
  onBack: () => void;
}> = ({ messages, isLoading, onSendMessage, onBack }) => {
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
  
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: 'end' });
    };
  
    useEffect(() => {
      setTimeout(scrollToBottom, 100);
    }, [messages, isLoading]);
  
    const handleSend = () => {
      if (inputText.trim()) {
        onSendMessage(inputText.trim());
        setInputText('');
      }
    };
  
    return (
      <div className="h-full flex flex-col animate-chat-open bg-slate-900">
        <header className="flex justify-between items-center flex-shrink-0 h-20 px-4 pt-6 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-300 button-press"><BackIcon /></button>
          <h2 className="text-lg font-bold">Symmetric Coach</h2>
          <div className="w-8"></div>
        </header>
  
        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex-1 space-y-4">
            {messages.map((message, index) => (
              <div key={message.id} className={`flex items-start gap-2.5 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                {message.sender === 'coach' && <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 mt-1"></div>}
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-md ${message.sender === 'user' ? 'bg-blue-600 text-white rounded-br-lg' : 'bg-slate-700 text-gray-200 rounded-bl-lg'}`}>
                  {message.sender === 'coach' && index === messages.length - 1 && isLoading && message.text ? (
                     <TypewriterText text={message.text} speed={30} className="leading-relaxed whitespace-pre-wrap" />
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.sender === 'user' && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 mt-1"></div>
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-slate-700 text-gray-200 rounded-bl-lg shadow-md">
                  <p className="opacity-70 leading-relaxed">Thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>
        
        <footer className="w-full p-4 flex-shrink-0 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-800 border border-slate-600 rounded-full py-2.5 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={handleSend} className="bg-blue-600 text-white rounded-full p-2.5 button-press hover:bg-blue-500 transition-colors disabled:bg-gray-600" disabled={!inputText.trim()}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </div>
        </footer>
      </div>
    );
};

interface HistoryScreenProps {
  sessions: SessionHistoryEntry[];
  onBack: () => void;
  getReadinessData: (score: number | null) => { color: string; word: string };
}
export const HistoryScreen: React.FC<HistoryScreenProps> = ({ sessions, onBack, getReadinessData }) => {
    return (
        <div className="h-full flex flex-col p-4 animate-screen-in">
            <div className="pt-8 flex items-center justify-between">
                <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors p-2 -ml-2 button-press"><BackIcon /></button>
                <h2 className="text-2xl font-bold text-center flex-1 -ml-4">Session History</h2>
                 <div className="w-8"></div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
                {sessions.length === 0 ? (
                    <div className="text-center text-gray-500 pt-16">No sessions recorded yet.</div>
                ) : (
                    [...sessions].reverse().map((session, index) => {
                        const readinessData = getReadinessData(session.post);
                        return (
                            <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold">{toDate(session.date).toLocaleDateString()}</h3>
                                    <span className="text-sm font-semibold" style={{ color: readinessData.color }}>{readinessData.word}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-center text-sm">
                                    <div className="bg-gray-800/50 rounded-lg p-2">
                                        <div className="text-gray-400">Readiness Score</div>
                                        <div className="font-semibold text-lg" style={{ color: readinessData.color }}>{Math.round(session.post)}</div>
                                    </div>
                                    <div className="bg-gray-800/50 rounded-lg p-2">
                                        <div className="text-gray-400">Total Reps</div>
                                        <div className="font-semibold text-lg">{session.totalReps.length}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
