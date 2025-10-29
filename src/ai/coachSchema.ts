export const CoachOutputSchema = {
  type: "object",
  properties: {
    line: { type: "string", minLength: 1, maxLength: 180 },
    action: {
      type: "string",
      enum: ["keep_load", "add_load", "reduce_load", "end_session", "add_set", "extend_rest"],
    },
    rest_s: { type: "number" },
  },
  required: ["line", "action"],
  additionalProperties: false,
} as const;

export type CoachOutput = {
  line: string;
  action: "keep_load" | "add_load" | "reduce_load" | "end_session" | "add_set" | "extend_rest";
  rest_s?: number;
};
