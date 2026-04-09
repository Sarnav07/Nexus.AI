import { z } from 'zod';
import { tokenSchema } from './common.js';

export const marketPriceInputSchema = z.object({
  symbol: tokenSchema,
});

export const marketOverviewInputSchema = z.object({
  symbols: z.array(tokenSchema).min(1).max(20).default(['ETH', 'BTC', 'USDC', 'OKB', 'UNI', 'LINK']),
});

export const marketSeriesInputSchema = z.object({
  symbol: tokenSchema,
  points: z.array(z.number().positive()).min(3),
  smaWindow: z.number().int().min(2).default(5),
  emaWindow: z.number().int().min(2).default(5),
});

export const lpOpportunityQuerySchema = z.object({
  minApy: z.number().min(0).default(0),
  limit: z.number().int().min(1).max(20).default(5),
});

export const marketPriceOutputSchema = z.object({
  symbol: z.string(),
  price: z.number().positive(),
  source: z.string(),
  timestamp: z.number().int().positive(),
});

export const marketOverviewOutputSchema = z.object({
  source: z.string(),
  prices: z.array(marketPriceOutputSchema),
  timestamp: z.number().int().positive(),
});

export const marketSignalOutputSchema = z.object({
  symbol: z.string(),
  sma: z.number().positive(),
  ema: z.number().positive(),
  momentum: z.enum(['bullish', 'neutral', 'bearish']),
  latestPrice: z.number().positive(),
});

export const lpOpportunitySchema = z.object({
  pair: z.string(),
  protocol: z.literal('Uniswap V3'),
  apy: z.number().nonnegative(),
  tvlUsd: z.number().nonnegative(),
  feeTier: z.number().int().positive(),
  volatilityScore: z.number().min(0).max(1),
  score: z.number().nonnegative(),
  risk: z.enum(['low', 'medium', 'high']),
});

export const lpOpportunityOutputSchema = z.object({
  opportunities: z.array(lpOpportunitySchema),
  count: z.number().int().nonnegative(),
  source: z.string(),
  timestamp: z.number().int().positive(),
});

export type MarketPriceOutput = z.infer<typeof marketPriceOutputSchema>;
export type MarketOverviewOutput = z.infer<typeof marketOverviewOutputSchema>;
export type MarketSignalOutput = z.infer<typeof marketSignalOutputSchema>;
export type LpOpportunityOutput = z.infer<typeof lpOpportunityOutputSchema>;
