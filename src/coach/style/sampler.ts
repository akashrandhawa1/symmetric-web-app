export type Sampler = { temperature: number; top_p: number };
export const TrainerSampler: Sampler = { temperature: 0.85, top_p: 0.9 }; // lively, not chaotic
