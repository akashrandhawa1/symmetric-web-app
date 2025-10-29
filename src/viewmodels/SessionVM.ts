import { computeReadinessDropFromRMS, DEFAULT_READINESS_CFG } from '@/lib/readiness';

export function onSetComplete(params: {
  repPeaksRms: number[];
  prevReadiness: number;
  exerciseId?: string;
  weightKg?: number;
  est1RMKg?: number;
}) {
  return computeReadinessDropFromRMS(
    {
      repPeaksRms: params.repPeaksRms,
      prevReadiness: params.prevReadiness,
      exerciseId: params.exerciseId,
      weightKg: params.weightKg,
      est1RMKg: params.est1RMKg,
    },
    DEFAULT_READINESS_CFG
  );
}

