export type FatigueState = 'rise' | 'plateau' | 'fall';

export interface FatigueDetectorConfig {
  ewmaAlpha: number;
  slopeLookbackSec: number;
  curvatureLookbackSec: number;
  historyWindowSec: number;
  noiseThreshold: number;
  riseSlopeThreshold: number;
  riseMinDurationSec: number;
  plateauSlopeThreshold: number;
  plateauCurvatureThreshold: number;
  plateauMinDurationSec: number;
  fallSlopeThreshold: number;
  fallMinDurationSec: number;
  mdfFallSlopeThreshold: number;
  requireMdfConfirmation: boolean;
}

export interface FatigueSampleInput {
  nowSec: number;
  rmsNorm: number;
  mdfNorm?: number | null;
}

export interface FatigueStateEvent {
  type: 'state';
  state: FatigueState;
  confidence: number;
  previousState: FatigueState | null;
  tInPrevState: number;
}

export interface FatigueDebugEvent {
  type: 'debug';
  slope: number;
  curvature: number;
  mdfSlope?: number;
}

export type FatigueDetectorEvent = FatigueStateEvent | FatigueDebugEvent;

type Listener<T> = (event: T) => void;

interface HistoryPoint {
  t: number;
  value: number;
  mdf?: number;
  smoothed: number;
}

const DEFAULT_CONFIG: FatigueDetectorConfig = {
  ewmaAlpha: 0.25,
  slopeLookbackSec: 3,
  curvatureLookbackSec: 6,
  historyWindowSec: 12,
  noiseThreshold: 0.07,
  riseSlopeThreshold: 1.0,
  riseMinDurationSec: 3,
  plateauSlopeThreshold: 0.25,
  plateauCurvatureThreshold: 0.15,
  plateauMinDurationSec: 6,
  fallSlopeThreshold: -0.8,
  fallMinDurationSec: 3,
  mdfFallSlopeThreshold: -0.5,
  requireMdfConfirmation: true,
};

const STATE_CONFIDENCE: Record<FatigueState, number> = {
  rise: 0.75,
  plateau: 0.7,
  fall: 0.8,
};

export class FatigueDetector {
  private config: FatigueDetectorConfig;
  private history: HistoryPoint[] = [];
  private state: FatigueState | null = null;
  private stateEnteredAt: number | null = null;
  private lastUpdateSec: number | null = null;
  private riseAccum = 0;
  private plateauAccum = 0;
  private fallAccum = 0;
  private lastSlope: number | null = null;
  private previousSlope: number | null = null;
  private lastDebugSlope: number | null = null;
  private stateListeners = new Set<Listener<FatigueStateEvent>>();
  private debugListeners = new Set<Listener<FatigueDebugEvent>>();

  constructor(config?: Partial<FatigueDetectorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  reset() {
    this.history = [];
    this.state = null;
    this.stateEnteredAt = null;
    this.lastUpdateSec = null;
    this.riseAccum = 0;
    this.plateauAccum = 0;
    this.fallAccum = 0;
    this.lastSlope = null;
    this.previousSlope = null;
    this.lastDebugSlope = null;
  }

  getState(): FatigueState | null {
    return this.state;
  }

  getTimeInState(nowSec: number): number {
    if (this.stateEnteredAt == null) return 0;
    return Math.max(0, nowSec - this.stateEnteredAt);
  }

  onState(listener: Listener<FatigueStateEvent>): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onDebug(listener: Listener<FatigueDebugEvent>): () => void {
    this.debugListeners.add(listener);
    return () => this.debugListeners.delete(listener);
  }

  update(sample: FatigueSampleInput) {
    const { nowSec, rmsNorm, mdfNorm } = sample;
    const { ewmaAlpha, historyWindowSec, slopeLookbackSec, curvatureLookbackSec, noiseThreshold } = this.config;

    if (this.lastUpdateSec != null && nowSec < this.lastUpdateSec) {
      return;
    }
    this.lastUpdateSec = nowSec;

    const prevSmoothed = this.history.length > 0 ? this.history[this.history.length - 1].smoothed : rmsNorm;
    const smoothed = prevSmoothed + ewmaAlpha * (rmsNorm - prevSmoothed);

    this.history.push({ t: nowSec, value: rmsNorm, smoothed, mdf: mdfNorm ?? undefined });

    while (this.history.length > 0 && nowSec - this.history[0].t > historyWindowSec) {
      this.history.shift();
    }

    if (this.history.length < 2) {
      return;
    }

    const slope = this.computeSlope(nowSec, slopeLookbackSec);
    const curvature = this.computeCurvature(nowSec, slopeLookbackSec, curvatureLookbackSec, slope);
    const mdfSlope = this.computeMdfSlope(nowSec);

    const referenceSmoothed = this.getSmoothedAt(nowSec - slopeLookbackSec);
    const isNoise = Math.abs(smoothed - referenceSmoothed) < noiseThreshold;
    const effectiveSlope = isNoise ? 0 : slope;

    this.updateAccumulators(nowSec, effectiveSlope, curvature);
    const nextState = this.evaluateState(nowSec, effectiveSlope, curvature, mdfSlope);

    this.emitDebug(effectiveSlope, curvature, mdfSlope);

    if (nextState && nextState !== this.state) {
      const previous = this.state;
      const tInPrev = this.stateEnteredAt != null ? nowSec - this.stateEnteredAt : 0;
      this.state = nextState;
      this.stateEnteredAt = nowSec;
      const event: FatigueStateEvent = {
        type: 'state',
        state: nextState,
        confidence: STATE_CONFIDENCE[nextState],
        previousState: previous,
        tInPrevState: tInPrev,
      };
      this.stateListeners.forEach((listener) => listener(event));
    }
  }

  private emitDebug(slope: number, curvature: number, mdfSlope?: number | null) {
    const payload: FatigueDebugEvent = {
      type: 'debug',
      slope,
      curvature,
      ...(mdfSlope == null ? {} : { mdfSlope }),
    };
    this.lastDebugSlope = slope;
    this.debugListeners.forEach((listener) => listener(payload));
  }

  private computeSlope(nowSec: number, lookback: number): number {
    const earlier = this.getPointAt(nowSec - lookback);
    const latest = this.history[this.history.length - 1];
    if (!earlier) return 0;
    const deltaValue = latest.smoothed - earlier.smoothed;
    const deltaTime = Math.max(1e-3, latest.t - earlier.t);
    const slope = (deltaValue / deltaTime) * 100;
    this.previousSlope = this.lastSlope;
    this.lastSlope = slope;
    return slope;
  }

  private computeCurvature(nowSec: number, slopeLookback: number, curvatureLookback: number, currentSlope: number): number {
    if (this.previousSlope == null || this.lastSlope == null) {
      return 0;
    }
    const deltaSlope = this.lastSlope - this.previousSlope;
    const previousPoint = this.history.length >= 2 ? this.history[this.history.length - 2] : null;
    const deltaTime = previousPoint ? nowSec - previousPoint.t : curvatureLookback;
    return deltaSlope / Math.max(1e-3, deltaTime);
  }

  private computeMdfSlope(nowSec: number): number | null {
    const latest = this.history[this.history.length - 1];
    if (latest.mdf == null) return null;
    const lookback = 8;
    const earlier = this.getPointAt(nowSec - lookback);
    if (!earlier || earlier.mdf == null) return null;
    const delta = latest.mdf - earlier.mdf;
    const deltaTime = Math.max(1e-3, latest.t - earlier.t);
    return (delta / deltaTime) * 100;
  }

  private getPointAt(targetTime: number): HistoryPoint | null {
    if (this.history.length === 0) return null;
    for (let i = this.history.length - 1; i >= 0; i -= 1) {
      if (this.history[i].t <= targetTime) {
        return this.history[i];
      }
    }
    return this.history[0];
  }

  private getSmoothedAt(targetTime: number): number {
    const point = this.getPointAt(targetTime);
    return point ? point.smoothed : this.history[this.history.length - 1].smoothed;
  }

  private updateAccumulators(nowSec: number, slope: number, curvature: number) {
    const { riseSlopeThreshold, plateauSlopeThreshold, plateauCurvatureThreshold, fallSlopeThreshold } = this.config;
    const previousPoint = this.history.length >= 2 ? this.history[this.history.length - 2] : null;
    const deltaTime = previousPoint ? nowSec - previousPoint.t : 0;

    if (slope >= riseSlopeThreshold) {
      this.riseAccum += deltaTime;
    } else {
      this.riseAccum = 0;
    }

    if (Math.abs(slope) <= plateauSlopeThreshold && Math.abs(curvature) <= plateauCurvatureThreshold) {
      this.plateauAccum += deltaTime;
    } else {
      this.plateauAccum = 0;
    }

    if (slope <= fallSlopeThreshold) {
      this.fallAccum += deltaTime;
    } else {
      this.fallAccum = 0;
    }
  }

  private evaluateState(nowSec: number, slope: number, curvature: number, mdfSlope: number | null): FatigueState | null {
    const {
      riseMinDurationSec,
      plateauMinDurationSec,
      fallMinDurationSec,
      requireMdfConfirmation,
      mdfFallSlopeThreshold,
    } = this.config;

    const totalDelta = Math.abs(this.history[this.history.length - 1].smoothed - this.history[0].smoothed);
    if (totalDelta < this.config.noiseThreshold) {
      return this.state;
    }

    if (this.fallAccum >= fallMinDurationSec) {
      if (!requireMdfConfirmation || mdfSlope == null || mdfSlope <= mdfFallSlopeThreshold) {
        return 'fall';
      }
    }

    if (this.riseAccum >= riseMinDurationSec) {
      return 'rise';
    }

    if (this.plateauAccum >= plateauMinDurationSec) {
      return 'plateau';
    }

    return this.state;
  }
}

export const defaultFatigueConfig = DEFAULT_CONFIG;
