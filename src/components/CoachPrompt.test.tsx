import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { CoachPrompt, CoachPromptProps } from "./CoachPrompt";

describe("CoachPrompt", () => {
  const baseProps: CoachPromptProps = {
    sessionId: "session-1",
    phase: "post_set",
    setIdx: 2,
    metrics: {
      fatigueFlag: false,
      symmetryGapPct: 0
    }
  };

  it("shows correct CTAs for symmetry gap >= 5", () => {
    const { getByTestId } = render(
      <CoachPrompt {...baseProps} metrics={{ ...baseProps.metrics, symmetryGapPct: 6 }} />
    );
    expect(getByTestId("coach-cta-end_early")).toBeInTheDocument();
    expect(getByTestId("coach-cta-hold_reps")).toBeInTheDocument();
  });

  it("shows correct CTAs for fatigueFlag", () => {
    const { getByTestId } = render(
      <CoachPrompt {...baseProps} metrics={{ ...baseProps.metrics, fatigueFlag: true }} />
    );
    expect(getByTestId("coach-cta-end_early")).toBeInTheDocument();
    expect(getByTestId("coach-cta-hold_reps")).toBeInTheDocument();
  });

  it("shows correct CTAs for default case", () => {
    const { getByTestId } = render(<CoachPrompt {...baseProps} />);
    expect(getByTestId("coach-cta-plus_one_rep")).toBeInTheDocument();
    expect(getByTestId("coach-cta-hold_reps")).toBeInTheDocument();
  });

  it("shows acknowledgment and fires event on CTA click", () => {
    const { getByTestId, queryByTestId } = render(<CoachPrompt {...baseProps} />);
    const btn = getByTestId("coach-cta-plus_one_rep");
    fireEvent.click(btn);
    expect(getByTestId("coach-ack")).toBeInTheDocument();
    expect(queryByTestId("coach-dismiss")).not.toBeInTheDocument();
  });

  it("fires event on dismiss", () => {
    const { getByTestId, queryByTestId } = render(<CoachPrompt {...baseProps} />);
    const btn = getByTestId("coach-dismiss");
    fireEvent.click(btn);
    expect(queryByTestId("coach-prompt")).not.toBeInTheDocument();
  });
});
