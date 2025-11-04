/** @jest-environment node */
import type { HandlerEvent, HandlerContext } from "@netlify/functions";
import { handler } from "../netlify/functions/coach-intake-next";

const mockGenerateContent = jest.fn();

jest.mock("../server/lib/geminiClient", () => ({
  getAI: jest.fn(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

const { getAI } = jest.requireMock("../server/lib/geminiClient") as { getAI: jest.Mock };

describe("coach-intake-next handler", () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    getAI.mockClear();
    process.env.GEMINI_API_KEY = "test-key";
  });

  const runHandler = (body: Record<string, unknown>): ReturnType<typeof handler> => {
    const event = {
      httpMethod: "POST",
      body: JSON.stringify(body),
    } as HandlerEvent;
    return handler(event, {} as HandlerContext, () => {});
  };

  it("returns a Gemini turn when the model responds", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        persona_line: "Testing prompt alignment",
        scc: { suggest: "Suggest", confirm: "Confirm", compensate: "Compensate" },
        question: "What should I call you?",
        topic: "name",
        chips: [],
      }),
    });

    const response = await runHandler({ answers: {}, coverage: {} });
    expect(response.statusCode).toBe(200);

    const payload = JSON.parse(response.body) as NextAction;
    expect(payload.action).toBe("turn");
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it("falls back to scripted flow when Gemini is unavailable", async () => {
    mockGenerateContent.mockRejectedValue(new Error("quota exceeded"));

    const response = await runHandler({ answers: {}, coverage: {} });
    expect(response.statusCode).toBe(200);

    const payload = JSON.parse(response.body) as NextAction;
    expect(payload.action).toBe("turn");
    expect(payload.turn.topic).toBe("name");
  });

  it("generates a Gemini-authored wrap when coverage is met", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        coach_intro: "Akash, here is your training blueprint—let's build momentum.",
        plan_summary: {
          goal: "general",
          weeks: 6,
          days_per_week: 3,
          session_length_min: 45,
          constraints_notes: "No constraints flagged",
          blocks: [
            { name: "Foundation", objective: "Prime core and mobility for strong lifts." },
            { name: "Strength Engine", objective: "Full-body compound focus with tempo control." },
            { name: "Finish & Recover", objective: "Plyo finishers plus breathing reset." },
          ],
        },
      }),
    });

    const response = await runHandler({
      answers: {
        name: "Akash",
        goal_intent: "general",
        motivation: "confidence boost",
        constraints: "none",
        environment: "home (rack)",
        equipment: "bodyweight",
        experience_level: "intermediate",
        form_confidence: "mostly confident",
        frequency: "3",
        session_length: "45",
      },
      coverage: {
        name: true,
        goal_intent: true,
        experience_level: true,
        constraints: true,
        environment: true,
        frequency: true,
        session_length: true,
      },
      user_name: "Akash",
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.body) as NextAction;
    expect(payload.action).toBe("wrap");
    expect(payload.wrap.plan_summary.goal).toBe("general");
    expect(payload.wrap.plan_summary.blocks.length).toBeGreaterThanOrEqual(2);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});

type NextAction =
  | { action: "turn"; turn: IntakeTurn }
  | { action: "negotiation"; negotiation: NegotiationTurn }
  | { action: "wrap"; wrap: WrapTurn };

type IntakeTurn = {
  persona_line: string;
  scc: { suggest: string; confirm: string; compensate: string };
  question: string;
  topic: Topic;
  chips?: string[];
};

type NegotiationTurn = {
  coach_take: string;
  question: string;
  chips?: string[];
};

type WrapTurn = {
  coach_intro: string;
  plan_summary: {
    goal: string;
    weeks: number;
    days_per_week: number;
    session_length_min: number;
    constraints_notes: string;
  };
};

type Topic = string;
