import test from 'node:test';
import assert from 'node:assert/strict';
import { getTokenPrice, getYieldOpportunities } from './market-tools.js';

test('market tool returns specialist-backed token price', async () => {
  const result = await getTokenPrice.execute({ symbol: 'ETH' }, { toolCallId: 't1', messages: [] });
  assert.equal(result.symbol, 'ETH');
  assert.equal(typeof result.price, 'number');
  assert.ok(result.price > 0);
  assert.equal(typeof result.source, 'string');
});

test('yield opportunities tool returns ranked pools', async () => {
  const result = await getYieldOpportunities.execute({ minAPY: 5, limit: 3 }, { toolCallId: 't2', messages: [] });
  assert.ok(result.count >= 0);
  assert.ok(Array.isArray(result.pools));
});
