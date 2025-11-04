import type { PlanSummary } from "./openSchema";

const STORAGE_KEY = "__COACH_INTAKE_PROFILE__";

export type StoredIntakeProfile = {
  answers: Record<string, any>;
  planSummary?: PlanSummary | null;
  savedAt: number;
};

const isStorageAvailable = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

export function saveIntakeProfile(options: { answers: Record<string, any>; planSummary?: PlanSummary | null }) {
  if (!isStorageAvailable()) return;
  const payload: StoredIntakeProfile = {
    answers: options.answers ?? {},
    planSummary: options.planSummary ?? null,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("[coach-intake] Failed to persist intake profile:", error);
  }
}

export function loadIntakeProfile(): StoredIntakeProfile | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredIntakeProfile | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.answers || typeof parsed.answers !== "object") return null;
    return {
      answers: parsed.answers,
      planSummary: parsed.planSummary ?? null,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch (error) {
    console.warn("[coach-intake] Failed to load intake profile:", error);
    return null;
  }
}

export function clearIntakeProfile() {
  if (!isStorageAvailable()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
