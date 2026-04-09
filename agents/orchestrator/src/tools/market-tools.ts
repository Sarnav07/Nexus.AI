import { tool } from 'ai';
import { z } from 'zod';
import { createMarketScoutService, ValidationError } from '@nexus/specialist';

const marketScout = createMarketScoutService();

export const getTokenPrice = tool({
  description: 'Get current token price in USD from specialist Market Scout.',
  parameters: z.object({
    symbol: z.string().transform((s) => s.toUpperCase()).describe('Token symbol, e.g. ETH, BTC, USDC'),
  }),
  execute: async ({ symbol }) => {
    const result = await marketScout.getTokenPrice({ symbol });
    return {
      symbol: result.symbol,
      price: result.price,
      source: result.source,
      timestamp: result.timestamp,
      message: `${result.symbol} price: $${result.price.toLocaleString()} (${result.source})`,
    };
  },
});

export const getMarketOverview = tool({
  description: 'Get market overview from specialist Market Scout.',
  parameters: z.object({
    symbols: z.array(z.string()).min(1).max(20).default(['ETH', 'BTC', 'OKB', 'UNI', 'LINK', 'USDC']),
  }),
  execute: async ({ symbols }) => {
    const result = await marketScout.getMarketOverview({ symbols });
    return {
      source: result.source,
      tokens: result.prices.map((pricePoint) => ({ symbol: pricePoint.symbol, price: pricePoint.price })),
      timestamp: result.timestamp,
      message:
        'Market Overview:\n' +
        result.prices.map((pricePoint) => `${pricePoint.symbol}: $${pricePoint.price.toLocaleString()}`).join('\n'),
    };
  },
});

export const getYieldOpportunities = tool({
  description: 'Get ranked Uniswap V3 LP opportunities from specialist Market Scout.',
  parameters: z.object({
    minAPY: z.number().min(0).default(0).describe('Minimum APY filter (percentage)'),
    limit: z.number().int().min(1).max(20).default(5),
  }),
  execute: async ({ minAPY, limit }) => {
    const result = await marketScout.getLpOpportunities({ minApy: minAPY, limit });

    return {
      source: result.source,
      count: result.count,
      pools: result.opportunities.map((pool) => ({
        pair: pool.pair,
        protocol: pool.protocol,
        apy: pool.apy,
        tvl: `${(pool.tvlUsd / 1_000_000).toFixed(2)}M`,
        fee: `${(pool.feeTier / 10000).toFixed(2)}%`,
        risk: pool.risk,
        score: pool.score,
      })),
      timestamp: result.timestamp,
      message:
        result.count === 0
          ? `No yield opportunities found above ${minAPY}% APY.`
          : `Found ${result.count} yield opportunities:\n` +
            result.opportunities
              .map((pool) => `${pool.pair} — ${pool.apy.toFixed(2)}% APY (score ${pool.score.toFixed(2)}, risk: ${pool.risk})`)
              .join('\n'),
    };
  },
});

export const getMarketSignal = tool({
  description: 'Compute SMA/EMA and momentum signal from a provided price series.',
  parameters: z.object({
    symbol: z.string().describe('Token symbol'),
    prices: z.array(z.number().positive()).min(3).describe('Chronological price points'),
    smaWindow: z.number().int().min(2).default(5),
    emaWindow: z.number().int().min(2).default(5),
  }),
  execute: async ({ symbol, prices, smaWindow, emaWindow }) => {
    try {
      return marketScout.computeSignals({
        symbol,
        points: prices,
        smaWindow,
        emaWindow,
      });
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        return {
          error: error.code,
          details: error.details,
          message: error.message,
        };
      }
      throw error;
    }
  },
});
