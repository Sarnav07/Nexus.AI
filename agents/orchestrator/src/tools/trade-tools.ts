import { tool } from 'ai';
import { z } from 'zod';
import { buildExecutionPayloadWithDefaults, buildLogSignalPayload } from '@nexus/specialist';
import { runRiskGuardianCheck } from '@nexus/risk-guardian';

const signalTypeMap = {
  market_buy: 'MARKET_BUY',
  market_sell: 'MARKET_SELL',
  add_liquidity: 'UNISWAP_V3_ADD_LIQUIDITY',
  remove_liquidity: 'UNISWAP_V3_REMOVE_LIQUIDITY',
} as const;

export const buildTradePayload = tool({
  description:
    'Build a structured trade payload for execution via specialist Yield Farmer, with deterministic idempotency and encoded SignalRegistry intent.',
  parameters: z.object({
    action: z.enum(['market_buy', 'market_sell', 'add_liquidity', 'remove_liquidity']),
    tokenIn: z.string().describe('Token being sold or deposited (symbol/address)'),
    tokenOut: z.string().describe('Token being bought or received (symbol/address)'),
    amountUSDC: z.number().positive().describe('Trade amount in USDC terms'),
    referenceTick: z.number().int().default(0).describe('Reference pool tick'),
    volatilityBps: z.number().int().min(10).max(5000).default(400),
    feeTier: z.union([z.literal(100), z.literal(500), z.literal(3000), z.literal(10000)]).default(3000),
    riskProfile: z.enum(['conservative', 'balanced', 'aggressive']).default('balanced'),
  }),
  execute: async ({ action, tokenIn, tokenOut, amountUSDC, referenceTick, volatilityBps, feeTier, riskProfile }) => {
    const execution = buildExecutionPayloadWithDefaults({
      action,
      tokenIn,
      tokenOut,
      amountUSDC,
      referenceTick,
      volatilityBps,
      feeTier,
      riskProfile,
    });

    const signalPayload = buildLogSignalPayload({
      signalType: signalTypeMap[action],
      tokenIn: execution.metadata.tokenInAddress,
      tokenOut: execution.metadata.tokenOutAddress,
      amountIn: execution.metadata.amountInRaw,
      tickLower: execution.tickRange.tickLower,
      tickUpper: execution.tickRange.tickUpper,
    });

    const payload = {
      signalType: signalTypeMap[action],
      signalTypeHash: signalPayload.preTradeSignal.signalTypeHash,
      tokenIn: { symbol: tokenIn.toUpperCase(), address: signalPayload.preTradeSignal.tokenIn },
      tokenOut: { symbol: tokenOut.toUpperCase(), address: signalPayload.preTradeSignal.tokenOut },
      amountIn: execution.metadata.amountInRaw,
      amountInUSDC: amountUSDC,
      tickLower: execution.tickRange.tickLower,
      tickUpper: execution.tickRange.tickUpper,
      execution,
      signalIntent: signalPayload,
      status: 'PENDING_RISK_CHECK',
      timestamp: new Date().toISOString(),
    };

    return {
      payload,
      message:
        `📋 Trade payload built (specialist):\n` +
        `  Action: ${action.toUpperCase()}\n` +
        `  ${tokenIn.toUpperCase()} → ${tokenOut.toUpperCase()}\n` +
        `  Amount: $${amountUSDC} USDC\n` +
        `  Idempotency: ${execution.idempotencyKey.slice(0, 12)}...\n` +
        `  Status: Pending risk check`,
    };
  },
});

export const simulateTradeExecution = tool({
  description:
    'Generate execution bundle and signal intent payload to be consumed by orchestrator/risk-guardian/signer pipeline.',
  parameters: z.object({
    action: z.enum(['market_buy', 'market_sell', 'add_liquidity', 'remove_liquidity']),
    tokenIn: z.string(),
    tokenOut: z.string(),
    amountUSDC: z.number().positive(),
    userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    referenceTick: z.number().int().default(0),
    volatilityBps: z.number().int().min(10).max(5000).default(400),
    feeTier: z.union([z.literal(100), z.literal(500), z.literal(3000), z.literal(10000)]).default(3000),
    riskProfile: z.enum(['conservative', 'balanced', 'aggressive']).default('balanced'),
  }),
  execute: async ({ action, tokenIn, tokenOut, amountUSDC, userAddress, referenceTick, volatilityBps, feeTier, riskProfile }) => {
    const execution = buildExecutionPayloadWithDefaults({
      action,
      tokenIn,
      tokenOut,
      amountUSDC,
      referenceTick,
      volatilityBps,
      feeTier,
      riskProfile,
      userAddress,
    });

    const signalPayload = buildLogSignalPayload({
      signalType: signalTypeMap[action],
      tokenIn: execution.metadata.tokenInAddress,
      tokenOut: execution.metadata.tokenOutAddress,
      amountIn: execution.metadata.amountInRaw,
      tickLower: execution.tickRange.tickLower,
      tickUpper: execution.tickRange.tickUpper,
    });

    return {
      execution: {
        id: `exec_${execution.idempotencyKey.slice(0, 16)}`,
        action,
        tokenIn: tokenIn.toUpperCase(),
        tokenOut: tokenOut.toUpperCase(),
        amountUSDC,
        userAddress,
        slippageBps: execution.metadata.slippageBps,
        steps: [
          ...(await Promise.all([
            runRiskGuardianCheck(
              {
                idempotencyKey: execution.idempotencyKey,
                chainId: execution.chainId,
                target: execution.target,
                data: execution.data,
                value: execution.value,
                tickRange: execution.tickRange,
                metadata: execution.metadata
              },
              userAddress,
              '0x7b6483fbb5d1716a1e26cb9d99257673dfd6eee7',
              process.env.X_LAYER_RPC_URL || 'https://testrpc.xlayer.tech'
            ).then((isOk) => ({
              step: 1,
              name: 'Risk Check',
              status: isOk ? '✅ PASSED' : '❌ FAILED',
              details: isOk ? 'Validated by Risk Guardian' : 'Rejected by Risk Guardian'
            }))
          ])),
          { step: 2, name: 'Signal Intent', status: 'READY', details: 'SignalRegistry calldata prepared' },
          { step: 3, name: 'Execution Payload', status: 'READY', details: 'Calldata-ready bundle for signer' },
        ],
        status: 'WAITING_FOR_SIGNATURE',
        executionPayload: execution,
        signalIntent: signalPayload,
        timestamp: new Date().toISOString(),
      },
      message:
        `🚀 Execution bundle prepared:\n` +
        `  Action: ${action.toUpperCase()}\n` +
        `  Pair: ${tokenIn.toUpperCase()}/${tokenOut.toUpperCase()}\n` +
        `  Amount: $${amountUSDC} USDC\n` +
        `  Ready for Risk Guardian + signer`,
    };
  },
});
