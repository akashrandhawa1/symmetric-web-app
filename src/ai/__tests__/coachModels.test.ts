import { describe, it, expect } from "vitest";
import { pickCoachModel, FALLBACK } from "../coachModels";

describe("pickCoachModel", () => {
  it("chooses live for liveSet", () => {
    expect(pickCoachModel({ mode: "liveSet" })).toBe("gemini-2.0-flash-live");
  });

  it("chooses flash for heavy tasks", () => {
    expect(pickCoachModel({ mode: "home", heavy: true })).toBe("gemini-2.5-flash");
  });

  it("defaults to 2.0-flash", () => {
    expect(pickCoachModel({ mode: "home" })).toBe("gemini-2.0-flash");
  });

  it("has sensible fallbacks", () => {
    expect(FALLBACK["gemini-2.0-flash"]).toBe("gemini-2.0-flash-lite");
  });
});
