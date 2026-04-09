import { ValidationError } from '../shared/errors.js';
import type { Momentum, LpPoolInput, RiskLevel } from '../types/index.js';

export function computeSMA(prices: number[], window: number): number {
  if (window < 2 || prices.length < window) {
    throw new ValidationError('Invalid SMA window', { window, points: prices.length });
  }
  const slice = prices.slice(prices.length - window);
  const avg = slice.reduce((a, b) => a + b, 0) / window;
  return Number(avg.toFixed(6));
}

export function computeEMA(prices: number[], window: number): number {
  if (window < 2 || prices.length < window) {
    throw new ValidationError('Invalid EMA window', { window, points: prices.length });
  }

  const k = 2 / (window + 1);
  const seed = prices.slice(0, window).reduce((a, b) => a + b, 0) / window;
  const ema = prices.slice(window).reduce((acc, p) => p * k + acc * (1 - k), seed);
  return Number(ema.toFixed(6));
}

export function computeMomentum(latestPrice: number, sma: number, ema: number): Momentum {
  if (latestPrice > sma && latestPrice > ema) return 'bullish';
  if (latestPrice < sma && latestPrice < ema) return 'bearish';
  return 'neutral';
}

function riskFromVolatility(volatilityScore: number): RiskLevel {
  if (volatilityScore >= 0.7) return 'high';
  if (volatilityScore >= 0.4) return 'medium';
  return 'low';
}

export function scoreOpportunity(pool: LpPoolInput): number {
  if (pool.volatilityScore < 0 || pool.volatilityScore > 1) {
    throw new ValidationError('volatilityScore must be between 0 and 1', { pool });
  }

  const apyScore = pool.apy * 3;
  const depthScore = Math.log10(pool.tvlUsd + 1) * 5;
  const feeScore = pool.feeTier === 500 ? 8 : pool.feeTier === 3000 ? 6 : 4;
  const volatilityPenalty = pool.volatilityScore * 15;

  return Number((apyScore + depthScore + feeScore - volatilityPenalty).toFixed(4));
}

export function rankLpOpportunities(pools: LpPoolInput[], minApy: number, limit: number) {
  return pools
    .filter((pool) => pool.apy >= minApy)
    .map((pool) => ({
      ...pool,
      score: scoreOpportunity(pool),
      risk: riskFromVolatility(pool.volatilityScore),
      protocol: 'Uniswap V3' as const,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
