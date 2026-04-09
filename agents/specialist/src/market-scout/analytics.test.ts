import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSMA, computeEMA, computeMomentum, rankLpOpportunities } from './analytics.js';

test('computeSMA computes latest window average', () => {
  const sma = computeSMA([100, 102, 104, 106, 108], 3);
  assert.equal(sma, 106);
});

test('computeEMA returns deterministic value', () => {
  const ema = computeEMA([100, 101, 103, 102, 104, 106], 3);
  assert.equal(typeof ema, 'number');
  assert.ok(ema > 0);
});

test('computeMomentum classifies direction', () => {
  assert.equal(computeMomentum(110, 100, 102), 'bullish');
  assert.equal(computeMomentum(90, 100, 98), 'bearish');
  assert.equal(computeMomentum(100, 100, 99.9), 'neutral');
});

test('rankLpOpportunities sorts by score and applies filters', () => {
  const ranked = rankLpOpportunities(
    [
      { pair: 'A/B', apy: 10, tvlUsd: 1_000_000, feeTier: 3000, volatilityScore: 0.4 },
      { pair: 'C/D', apy: 20, tvlUsd: 100_000, feeTier: 10000, volatilityScore: 0.8 },
      { pair: 'E/F', apy: 5, tvlUsd: 10_000_000, feeTier: 500, volatilityScore: 0.2 },
    ],
    6,
    2,
  );

  assert.equal(ranked.length, 2);
  assert.ok(ranked[0]!.score >= ranked[1]!.score);
  assert.ok(ranked.every((item) => item.apy >= 6));
});
