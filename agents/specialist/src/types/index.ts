export type Momentum = 'bullish' | 'neutral' | 'bearish';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface LpPoolInput {
  pair: string;
  apy: number;
  tvlUsd: number;
  feeTier: 100 | 500 | 3000 | 10000;
  volatilityScore: number;
}
