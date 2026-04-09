import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTickRange, getTickSpacingForFee, normalizeTickToSpacing } from './ticks.js';

test('fee tier maps to tick spacing', () => {
  assert.equal(getTickSpacingForFee(500), 10);
  assert.equal(getTickSpacingForFee(3000), 60);
});

test('normalizeTickToSpacing aligns downward', () => {
  assert.equal(normalizeTickToSpacing(123, 10), 120);
  assert.equal(normalizeTickToSpacing(-123, 10), -130);
});

test('computeTickRange returns valid spaced range', () => {
  const range = computeTickRange({
    referenceTick: 1234,
    volatilityBps: 400,
    feeTier: 3000,
    riskProfile: 'balanced',
  });

  assert.ok(range.tickLower < range.tickUpper);
  assert.equal(range.tickLower % range.tickSpacing, 0);
  assert.equal(range.tickUpper % range.tickSpacing, 0);
});
