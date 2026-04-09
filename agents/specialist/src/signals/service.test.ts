import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLogSignalPayload, buildLogSignalBatchPayload } from './service.js';

test('buildLogSignalPayload encodes logSignal calldata', () => {
  const out = buildLogSignalPayload({
    signalType: 'MARKET_BUY',
    tokenIn: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
    tokenOut: '0x4200000000000000000000000000000000000006',
    amountIn: '1000000',
    tickLower: 0,
    tickUpper: 0,
  });

  assert.equal(out.preTradeSignal.signalType, 'MARKET_BUY');
  assert.ok(out.encodedCall.data.startsWith('0x'));
  assert.equal(out.encodedCall.value, '0');
});

test('buildLogSignalBatchPayload encodes batch calldata', () => {
  const out = buildLogSignalBatchPayload([
    {
      signalType: 'MARKET_SELL',
      tokenIn: '0x4200000000000000000000000000000000000006',
      tokenOut: '0x74b7f16337b8972027f6196a17a631ac6de26d22',
      amountIn: '2000000',
      tickLower: 0,
      tickUpper: 0,
    },
  ]);

  assert.equal(out.signals.length, 1);
  assert.ok(out.encodedCall.data.startsWith('0x'));
});
