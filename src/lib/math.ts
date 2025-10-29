import type { RoundingStrategy } from "../types/formula";

/**
 * Apply rounding strategy to a number
 */
export function applyRounding(
  value: number,
  strategy: RoundingStrategy
): number {
  switch (strategy) {
    case "floor":
      return Math.floor(value);
    case "ceil":
      return Math.ceil(value);
    case "round":
      return Math.round(value);
    case "trunc":
      return Math.trunc(value);
    default:
      return value;
  }
}

/**
 * Round a number to a specific number of decimal places
 */
export function roundToScale(
  value: number,
  scale: number,
  strategy: RoundingStrategy = "round"
): number {
  const multiplier = Math.pow(10, scale);
  const scaled = value * multiplier;
  const rounded = applyRounding(scaled, strategy);
  return rounded / multiplier;
}

/**
 * Calculate absolute difference between two numbers
 */
export function absoluteDifference(a: number, b: number): number {
  return Math.abs(a - b);
}

/**
 * Calculate relative difference between two numbers (as a percentage)
 */
export function relativeDifference(a: number, b: number): number {
  if (a === 0) {
    return b === 0 ? 0 : Infinity;
  }
  return Math.abs((b - a) / a) * 100;
}

/**
 * Calculate absolute and relative errors between two results
 */
export function calculateErrors(
  result1: Record<string, any>,
  result2: Record<string, any>
): {
  absDiff: Record<string, number>;
  relDiff: Record<string, number>;
} {
  const absDiff: Record<string, number> = {};
  const relDiff: Record<string, number> = {};

  for (const key in result1) {
    if (typeof result1[key] === "number" && typeof result2[key] === "number") {
      absDiff[key] = absoluteDifference(result1[key], result2[key]);
      relDiff[key] = relativeDifference(result1[key], result2[key]);
    }
  }

  return { absDiff, relDiff };
}

/**
 * Check if two numbers are equal within a threshold
 */
export function areEqual(
  a: number,
  b: number,
  threshold: number = 1e-12
): boolean {
  return absoluteDifference(a, b) <= threshold;
}

/**
 * Normalize a number to a specific precision
 */
export function normalizePrecision(
  value: number,
  scale: number,
  rounding: RoundingStrategy = "round"
): number {
  return roundToScale(value, scale, rounding);
}
