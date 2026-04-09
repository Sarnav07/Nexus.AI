import test from 'node:test';
import assert from 'node:assert/strict';
import { executionBundleSchema } from './yield.js';

test('execution bundle schema validates expected structure', () => {
  const parsed = executionBundleSchema.parse({
    idempotencyKey: 'abc123abc123abc123abc123abc123ab',
    chainId: 1952,
    target: '0x0000000000000000000000000000000000000005',
    data: '0x1234',
    value: '0',
    tickRange: {
      tickLower: -120,
      tickUpper: 120,
      tickSpacing: 60,
    },
    metadata: {
      action: 'market_buy',
      tokenIn: 'USDC',
      tokenOut: 'WETH',
      tokenInAddress: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
      tokenOutAddress: '0x4200000000000000000000000000000000000006',
      feeTier: 3000,
      slippageBps: 50,
      deadline: 1_800_000_000,
      amountInRaw: '1000000',
      amountOutMinRaw: '990000',
      riskProfile: 'balanced',
      rationale: 'test rationale',
      confidence: 0.8,
      tags: ['yield-farmer'],
    },
  });

  assert.equal(parsed.chainId, 1952);
  assert.equal(parsed.metadata.action, 'market_buy');
});
