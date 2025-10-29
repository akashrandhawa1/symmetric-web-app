export type Zone = 'building' | 'in_zone' | 'too_heavy_early' | 'too_light' | 'low_signal';

export type RepFeature = {
  idx: number;
  rmsNorm: number;
  signalConfidence: number;
  repTempoOK?: boolean;
  repVelocity?: number | null;
};

