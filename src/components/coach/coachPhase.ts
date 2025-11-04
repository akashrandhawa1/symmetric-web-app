export type CoachPhase = "intake" | "preview" | "live";
type Listener = (p: CoachPhase) => void;
class CoachState {
  phase: CoachPhase = "intake";
  private ls = new Set<Listener>();
  setPhase(p: CoachPhase){ this.phase = p; this.ls.forEach(f=>f(p)); }
  onChange(f: Listener){ this.ls.add(f); return () => this.ls.delete(f); }
}
export const coachState = new CoachState();
