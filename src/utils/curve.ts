const POINT_COUNT = 7;

/**
 * Generates a smooth projection curve that eases toward the provided target.
 * Designed for sparkline style visuals where the final value is most important.
 */
export const curve = (target: number, length = POINT_COUNT): number[] => {
  if (length < 2) return [target];

  const clampedTarget = Number.isFinite(target) ? target : 0;
  const start = Math.max(0, clampedTarget * 0.45);

  return Array.from({ length }, (_, index) => {
    const t = index / (length - 1);
    // Ease in then out to keep earlier points lower and finish at the target.
    const eased = t * t * (3 - 2 * t);
    const value = start + (clampedTarget - start) * eased;
    return Number(value.toFixed(2));
  });
};

export default curve;
