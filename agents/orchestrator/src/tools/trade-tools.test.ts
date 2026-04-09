import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTradePayload, simulateTradeExecution } from './trade-tools.js';

test('buildTradePayload returns execution + signal intent', async () => {
  const result = await buildTradePayload.execute(
    {
      action: 'add_liquidity',
      tokenIn: 'USDC',
      tokenOut: 'WETH',
      amountUSDC: 150,
      referenceTick: 0,
      volatilityBps: 400,
      feeTier: 3000,
      riskProfile: 'balanced',
    },
    { toolCallId: 't3', messages: [] },
  );

  assert.equal(result.payload.status, 'PENDING_RISK_CHECK');
  assert.ok(result.payload.execution.idempotencyKey.length > 16);
  assert.ok(result.payload.signalIntent.encodedCall.data.startsWith('0x'));
});

test('simulateTradeExecution returns ready-for-signing bundle', async () => {
  const result = await simulateTradeExecution.execute(
    {
      action: 'market_buy',
      tokenIn: 'USDC',
      tokenOut: 'WETH',
      amountUSDC: 75,
      userAddress: '0x1111111111111111111111111111111111111111',
      referenceTick: 0,
      volatilityBps: 300,
      feeTier: 3000,
      riskProfile: 'balanced',
    },
    { toolCallId: 't4', messages: [] },
  );

  assert.equal(result.execution.status, 'READY_FOR_ORCHESTRATOR_SIGNING');
  assert.ok(result.execution.executionPayload.data.startsWith('0x'));
  assert.ok(result.execution.signalIntent.encodedCall.data.startsWith('0x'));
});
