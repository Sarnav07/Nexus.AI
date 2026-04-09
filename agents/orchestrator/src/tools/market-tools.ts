import { tool } from 'ai';
import { z } from 'zod';

/**
 * Mock Market Data Tool
 *
 * Returns simulated market data. Will be replaced by Person 3's
 * real Market Scout agent when ready.
 */

// Simulated token prices (updated per-call with slight randomness)
const BASE_PRICES: Record<string, number> = {
  ETH: 3250.0,
  BTC: 62500.0,
  OKB: 48.5,
  USDC: 1.0,
  USDT: 1.0,
  DAI: 1.0,
  WETH: 3250.0,
  WBTC: 62500.0,
  UNI: 7.85,
  LINK: 14.2,
  AAVE: 92.3,
  ARB: 1.12,
  OP: 2.45,
};

function jitter(price: number, pct = 0.02): number {
  const change = price * pct * (Math.random() * 2 - 1);
  return Math.round((price + change) * 100) / 100;
}

export const getTokenPrice = tool({
  description:
    'Get the current price of a token in USD. This is simulated market data for development — will be replaced by real feeds from the Market Scout agent.',
  parameters: z.object({
    symbol: z
      .string()
      .transform((s) => s.toUpperCase())
      .describe('Token symbol, e.g. ETH, BTC, USDC'),
  }),
  execute: async ({ symbol }) => {
    const base = BASE_PRICES[symbol];
    if (!base) {
      return {
        symbol,
        price: null,
        message: `Unknown token symbol: ${symbol}. Available: ${Object.keys(BASE_PRICES).join(', ')}`,
      };
    }

    const price = jitter(base);
    return {
      symbol,
      price,
      priceFormatted: `$${price.toLocaleString()}`,
      source: 'mock-market-scout',
      message: `${symbol} price: $${price.toLocaleString()} (simulated)`,
    };
  },
});

export const getMarketOverview = tool({
  description:
    'Get a market overview with prices of major tokens. Simulated data for development.',
  parameters: z.object({}),
  execute: async () => {
    const tokens = ['ETH', 'BTC', 'OKB', 'UNI', 'LINK', 'AAVE'];
    const prices = tokens.map((symbol) => ({
      symbol,
      price: jitter(BASE_PRICES[symbol]!),
      change24h: `${(Math.random() * 10 - 5).toFixed(2)}%`,
    }));

    return {
      source: 'mock-market-scout',
      tokens: prices,
      message:
        'Market Overview (simulated):\n' +
        prices
          .map((t) => `${t.symbol}: $${t.price.toLocaleString()} (${t.change24h})`)
          .join('\n'),
    };
  },
});

export const getYieldOpportunities = tool({
  description:
    'Get available DeFi yield opportunities (liquidity pools, farms). Simulated data — will be replaced by real data from the Yield Farmer agent.',
  parameters: z.object({
    minAPY: z
      .number()
      .min(0)
      .default(0)
      .describe('Minimum APY filter (percentage)'),
  }),
  execute: async ({ minAPY }) => {
    const pools = [
      { pair: 'ETH/USDC', protocol: 'Uniswap V3', apy: 12.5, tvl: '2.4M', fee: '0.3%', risk: 'Medium' },
      { pair: 'WBTC/ETH', protocol: 'Uniswap V3', apy: 8.2, tvl: '5.1M', fee: '0.3%', risk: 'Medium' },
      { pair: 'USDC/USDT', protocol: 'Uniswap V3', apy: 4.1, tvl: '12.8M', fee: '0.01%', risk: 'Low' },
      { pair: 'ETH/OKB', protocol: 'Uniswap V3', apy: 18.7, tvl: '890K', fee: '0.3%', risk: 'High' },
      { pair: 'UNI/ETH', protocol: 'Uniswap V3', apy: 15.3, tvl: '1.2M', fee: '0.3%', risk: 'Medium-High' },
      { pair: 'LINK/ETH', protocol: 'Uniswap V3', apy: 10.9, tvl: '780K', fee: '0.3%', risk: 'Medium' },
    ];

    const filtered = pools
      .filter((p) => p.apy >= minAPY)
      .map((p) => ({ ...p, apy: jitter(p.apy, 0.1) }));

    return {
      source: 'mock-yield-farmer',
      count: filtered.length,
      pools: filtered,
      message:
        filtered.length === 0
          ? `No yield opportunities found above ${minAPY}% APY.`
          : `Found ${filtered.length} yield opportunities:\n` +
            filtered
              .map((p) => `${p.pair} on ${p.protocol} — ${p.apy.toFixed(1)}% APY (TVL: $${p.tvl}, Risk: ${p.risk})`)
              .join('\n'),
    };
  },
});
