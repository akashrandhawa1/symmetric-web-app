export type PhaseStatus = 'active' | 'upcoming' | 'completed';

export interface Phase {
  title: string;
  weekRange: string;
  focus: string;
  outcome?: string;
  status: PhaseStatus;
}

export interface Constraint {
  label: string;
  explanation?: string;
  severity?: 'warning' | 'info';
}

export interface NextSession {
  duration: number;
  focus: string;
  estimatedDrop?: [number, number];
  preview?: string[];
}

export interface PlanSummary {
  sport?: string;
  sportEmoji?: string;
  weeks: number;
  daysPerWeek: number;
  sessionMinutes: number;
  setting: string;
  hasEquipmentMismatch?: boolean;
  equipmentMismatchMessage?: string;
}

export interface CTAConfig {
  label: string;
  subtext: string;
  currentReadiness?: number;
}

export interface PlanRevealMinimalProps {
  // Header
  eyebrow?: string;
  title: string;

  // Your Why
  why: string;

  // Summary
  summary: PlanSummary;

  // Constraints (optional)
  constraints?: Constraint[];

  // Phases
  phases: Phase[];

  // Next Session (optional)
  nextSession?: NextSession;

  // CTA
  cta: CTAConfig;
  onStart: () => void;

  // Optional help link
  onHelpClick?: () => void;
}
