import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExecutionPayloadWithDefaults } from './service.js';

test('buildExecutionPayloadWithDefaults builds execution bundle with idempotency', () => {
  const bundle = buildExecutionPayloadWithDefaults({
    action: 'add_liquidity',
    tokenIn: 'USDC',
    tokenOut: 'WETH',
    amountUSDC: 100,
    referenceTick: 0,
    volatilityBps: 400,
    feeTier: 3000,
    riskProfile: 'balanced',
  });

  assert.equal(bundle.chainId, 1952);
  assert.ok(bundle.idempotencyKey.length >= 16);
  assert.ok(bundle.data.startsWith('0x'));
  assert.equal(bundle.metadata.amountInRaw, '100000000');
  assert.ok(bundle.tickRange.tickLower < bundle.tickRange.tickUpper);
});
