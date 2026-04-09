import { ProviderError, ValidationError } from '../shared/errors.js';
import type { LpPoolInput } from '../types/index.js';
import { nowUnix } from '../shared/time.js';

export interface MarketProvider {
  readonly name: string;
  getTokenPrice(symbol: string): Promise<number>;
  getPools(): Promise<LpPoolInput[]>;
}

const BASE_PRICES: Record<string, number> = {
  ETH: 3250,
  WETH: 3250,
  BTC: 62500,
  WBTC: 62500,
  OKB: 48.5,
  USDC: 1,
  UNI: 7.85,
  LINK: 14.2,
};

function deterministicOffset(symbol: string): number {
  const seed = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const minuteBucket = Math.floor(nowUnix() / 60);
  const raw = (seed * 31 + minuteBucket * 17) % 100;
  return (raw - 50) / 10000;
}

export class MockMarketProvider implements MarketProvider {
  readonly name = 'mock-market-provider';

  async getTokenPrice(symbol: string): Promise<number> {
    const normalized = symbol.toUpperCase();
    const base = BASE_PRICES[normalized];
    if (!base) throw new ValidationError('Unsupported token symbol', { symbol });

    const offset = deterministicOffset(normalized);
    return Number((base * (1 + offset)).toFixed(6));
  }

  async getPools(): Promise<LpPoolInput[]> {
    return [
      { pair: 'ETH/USDC', apy: 12.5, tvlUsd: 2_400_000, feeTier: 3000, volatilityScore: 0.55 },
      { pair: 'WBTC/ETH', apy: 8.1, tvlUsd: 5_200_000, feeTier: 3000, volatilityScore: 0.43 },
      { pair: 'USDC/ETH', apy: 9.8, tvlUsd: 3_900_000, feeTier: 500, volatilityScore: 0.38 },
      { pair: 'UNI/ETH', apy: 15.2, tvlUsd: 1_300_000, feeTier: 3000, volatilityScore: 0.72 },
      { pair: 'LINK/ETH', apy: 10.7, tvlUsd: 820_000, feeTier: 3000, volatilityScore: 0.61 },
      { pair: 'ETH/OKB', apy: 18.6, tvlUsd: 890_000, feeTier: 3000, volatilityScore: 0.83 },
    ];
  }
}

export class OnchainOsMarketProvider implements MarketProvider {
  readonly name = 'onchainos-market-provider';

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string,
  ) {}

  async getTokenPrice(symbol: string): Promise<number> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/price?symbol=${encodeURIComponent(symbol.toUpperCase())}`;
    const response = await fetch(url, {
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined,
    });

    if (!response.ok) {
      throw new ProviderError('OnchainOS price request failed', {
        status: response.status,
        statusText: response.statusText,
      });
    }

    const data = (await response.json()) as { price?: number };
    if (typeof data.price !== 'number' || data.price <= 0) {
      throw new ProviderError('OnchainOS price response missing valid price', { symbol, data });
    }

    return data.price;
  }

  async getPools(): Promise<LpPoolInput[]> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/pools/uniswap-v3`;
    const response = await fetch(url, {
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined,
    });

    if (!response.ok) {
      throw new ProviderError('OnchainOS pools request failed', {
        status: response.status,
        statusText: response.statusText,
      });
    }

    const data = (await response.json()) as { pools?: LpPoolInput[] };
    if (!Array.isArray(data.pools)) {
      throw new ProviderError('OnchainOS pools response malformed', { data });
    }

    return data.pools;
  }
}

export function createMarketProvider(): MarketProvider {
  const provider = process.env.SPECIALIST_MARKET_PROVIDER || 'mock';
  if (provider === 'onchainos') {
    const baseUrl = process.env.ONCHAINOS_MARKET_API_BASE_URL;
    if (!baseUrl) {
      throw new ProviderError('ONCHAINOS_MARKET_API_BASE_URL is required when SPECIALIST_MARKET_PROVIDER=onchainos');
    }
    return new OnchainOsMarketProvider(baseUrl, process.env.ONCHAINOS_MARKET_API_KEY);
  }

  return new MockMarketProvider();
}
