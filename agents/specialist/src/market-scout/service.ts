import {
  lpOpportunityQuerySchema,
  lpOpportunityOutputSchema,
  marketOverviewInputSchema,
  marketOverviewOutputSchema,
  marketPriceInputSchema,
  marketPriceOutputSchema,
  marketSeriesInputSchema,
  marketSignalOutputSchema,
} from '../schemas/market.js';
import { nowUnix } from '../shared/time.js';
import { createMarketProvider, type MarketProvider } from './providers.js';
import { computeEMA, computeMomentum, computeSMA, rankLpOpportunities } from './analytics.js';

export class MarketScoutService {
  constructor(private readonly provider: MarketProvider = createMarketProvider()) {}

  async getTokenPrice(input: unknown) {
    const parsed = marketPriceInputSchema.parse(input);
    const price = await this.provider.getTokenPrice(parsed.symbol);

    return marketPriceOutputSchema.parse({
      symbol: parsed.symbol.toUpperCase(),
      price,
      source: this.provider.name,
      timestamp: nowUnix(),
    });
  }

  async getMarketOverview(input: unknown) {
    const parsed = marketOverviewInputSchema.parse(input);
    const prices = await Promise.all(parsed.symbols.map((symbol) => this.getTokenPrice({ symbol })));

    return marketOverviewOutputSchema.parse({
      source: this.provider.name,
      prices,
      timestamp: nowUnix(),
    });
  }

  computeSignals(input: unknown) {
    const parsed = marketSeriesInputSchema.parse(input);
    const sma = computeSMA(parsed.points, parsed.smaWindow);
    const ema = computeEMA(parsed.points, parsed.emaWindow);
    const latestPrice = parsed.points[parsed.points.length - 1] as number;

    return marketSignalOutputSchema.parse({
      symbol: parsed.symbol.toUpperCase(),
      sma,
      ema,
      momentum: computeMomentum(latestPrice, sma, ema),
      latestPrice,
    });
  }

  async getLpOpportunities(input: unknown) {
    const { minApy, limit } = lpOpportunityQuerySchema.parse(input);
    const pools = await this.provider.getPools();
    const opportunities = rankLpOpportunities(pools, minApy, limit);

    return lpOpportunityOutputSchema.parse({
      opportunities,
      count: opportunities.length,
      source: this.provider.name,
      timestamp: nowUnix(),
    });
  }
}

export function createMarketScoutService() {
  return new MarketScoutService();
}
