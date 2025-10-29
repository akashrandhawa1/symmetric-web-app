import React, { useEffect, useState } from "react";
import classNames from "classnames";
import { saveCoachDecision } from "../coachDecision";
import { getCoachSuggestions, SUGGESTION_LABELS, CoachRequest, CoachResponse } from "../lib/geminiCoach";

export type CoachPromptProps = {
  sessionId: string;
  phase: "post_set" | "end";
  setIdx?: number;
  metrics: {
    fatigueFlag: boolean;
    symmetryGapPct: number;
    ror?: number;
    rms?: number;
  };
  context?: any; // Passes CoachPromptContextInput for Gemini
  question?: string; // Optional user question for Gemini
};




export const CoachPrompt: React.FC<CoachPromptProps> = ({
  sessionId,
  phase,
  setIdx,
  metrics,
  context,
  question
}) => {
  const [coachResp, setCoachResp] = useState<CoachResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [ack, setAck] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);
    setCoachResp(null);
    setAck(false);
    window.dispatchEvent(
      new CustomEvent("coach_suggestion_shown", {
        detail: { sessionId, phase, setIdx, metrics }
      })
    );
    const req: CoachRequest = { sessionId, setIdx, phase, metrics };
    getCoachSuggestions(req)
      .then((resp) => { if (!ignore) setCoachResp(resp); })
      .catch(() => { if (!ignore) setError('Could not fetch coach feedback.'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [sessionId, phase, setIdx, JSON.stringify(metrics)]);

  const handleCta = (suggestionId: string) => {
    setAck(true);
    window.dispatchEvent(
      new CustomEvent("coach_suggestion_accepted", {
        detail: { sessionId, setIdx, phase, suggestionId, why: coachResp?.why, metrics }
      })
    );
    saveCoachDecision({ sessionId, setIdx, phase, suggestionId, why: coachResp?.why || '' });
    setTimeout(() => setAck(false), 1200);
  };

  const handleDismiss = () => {
    setDismissed(true);
    window.dispatchEvent(
      new CustomEvent("coach_suggestion_declined", {
        detail: { sessionId, setIdx, phase, metrics }
      })
    );
  };

  if (dismissed) return null;

  return (
    <div
      className="w-full max-w-xl mx-auto bg-white rounded-lg shadow p-4 flex flex-col justify-between items-center"
      style={{ minHeight: 100, maxHeight: 140 }}
      data-testid="coach-prompt"
    >
      {loading && <div className="text-gray-500">Loading coach feedback...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {coachResp && (
        <>
          <div className="w-full flex flex-col sm:flex-row gap-2 mb-2">
            <button
              className={classNames(
                "flex-1 py-2 px-3 rounded font-semibold text-white",
                "transition-colors duration-150",
                "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
                { 'opacity-60 pointer-events-none': ack }
              )}
              onClick={() => handleCta(coachResp.primary)}
              disabled={ack}
              data-testid="coach-cta-primary"
            >
              {SUGGESTION_LABELS[coachResp.primary]}
            </button>
            <button
              className={classNames(
                "flex-1 py-2 px-3 rounded font-semibold text-white",
                "transition-colors duration-150",
                "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
                { 'opacity-60 pointer-events-none': ack }
              )}
              onClick={() => handleCta(coachResp.secondary)}
              disabled={ack}
              data-testid="coach-cta-secondary"
            >
              {SUGGESTION_LABELS[coachResp.secondary]}
            </button>
          </div>
          <div className="text-xs text-gray-500 mb-1" data-testid="coach-why">
            {coachResp.why}
            {coachResp.payoff && (
              <span className="ml-1 text-gray-400"> (+{Math.round(coachResp.payoff.magnitudePct)}% in ~{Math.round(coachResp.payoff.hours)}h)</span>
            )}
          </div>
          {ack && <div className="text-green-700 text-sm font-medium" data-testid="coach-ack">Locked. I’ll track it and check if it paid off next time.</div>}
        </>
      )}
      <button
        className="text-xs text-gray-400 underline self-end"
        onClick={handleDismiss}
        data-testid="coach-dismiss"
      >
        Dismiss
      </button>
    </div>
  );
};

export default CoachPrompt;
