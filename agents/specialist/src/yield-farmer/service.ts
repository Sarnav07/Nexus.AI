import { encodeAbiParameters, parseAbiParameters } from 'viem';
import { EXECUTION_CONFIG } from '../config/execution.js';
import { executionBundleSchema, type YieldIntent, yieldIntentSchema } from '../schemas/yield.js';
import { buildIdempotencyKey } from '../shared/idempotency.js';
import { buildDeadline } from '../shared/time.js';
import { resolveTokenAddress } from '../shared/tokens.js';
import { computeTickRange } from './ticks.js';

function buildCalldata(params: {
  action: string;
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountInRaw: bigint;
  amountOutMinRaw: bigint;
  feeTier: number;
  tickLower: number;
  tickUpper: number;
  deadline: number;
}) {
  return encodeAbiParameters(
    parseAbiParameters('string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, uint24 feeTier, int24 tickLower, int24 tickUpper, uint256 deadline'),
    [
      params.action,
      params.tokenIn,
      params.tokenOut,
      params.amountInRaw,
      params.amountOutMinRaw,
      params.feeTier,
      params.tickLower,
      params.tickUpper,
      BigInt(params.deadline),
    ],
  );
}

export function buildExecutionPayload(input: unknown) {
  const parsed: YieldIntent = yieldIntentSchema.parse(input);

  const tokenInAddr = resolveTokenAddress(parsed.tokenIn);
  const tokenOutAddr = resolveTokenAddress(parsed.tokenOut);
  const tickRange = computeTickRange({
    referenceTick: parsed.referenceTick,
    volatilityBps: parsed.volatilityBps,
    feeTier: parsed.feeTier,
    riskProfile: parsed.riskProfile,
  });

  const amountInRaw = BigInt(Math.floor(parsed.amountUSDC * 1_000_000));
  const amountOutMinRaw = (amountInRaw * BigInt(10_000 - parsed.slippageBps)) / 10_000n;
  const deadline = buildDeadline(parsed.deadlineSeconds);

  const idempotencyKey = buildIdempotencyKey({
    action: parsed.action,
    tokenIn: tokenInAddr,
    tokenOut: tokenOutAddr,
    amountInRaw: amountInRaw.toString(),
    feeTier: parsed.feeTier,
    tickLower: tickRange.tickLower,
    tickUpper: tickRange.tickUpper,
    deadline,
  });

  const data = buildCalldata({
    action: parsed.action,
    tokenIn: tokenInAddr,
    tokenOut: tokenOutAddr,
    amountInRaw,
    amountOutMinRaw,
    feeTier: parsed.feeTier,
    tickLower: tickRange.tickLower,
    tickUpper: tickRange.tickUpper,
    deadline,
  });

  const rationale = parsed.action === 'add_liquidity'
    ? 'Provide concentrated liquidity in a range matched to risk profile and volatility.'
    : parsed.action === 'remove_liquidity'
      ? 'Reduce LP exposure and realize accrued fees.'
      : 'Execute directional swap based on orchestrator intent and market conditions.';

  const confidence = parsed.riskProfile === 'conservative' ? 0.72 : parsed.riskProfile === 'balanced' ? 0.78 : 0.69;

  return executionBundleSchema.parse({
    idempotencyKey,
    chainId: EXECUTION_CONFIG.chainId,
    target: EXECUTION_CONFIG.uniswapV3Router,
    data,
    value: '0',
    tickRange,
      metadata: {
        action: parsed.action,
        tokenIn: parsed.tokenIn.toUpperCase(),
        tokenOut: parsed.tokenOut.toUpperCase(),
        tokenInAddress: tokenInAddr,
        tokenOutAddress: tokenOutAddr,
        feeTier: parsed.feeTier,
        slippageBps: parsed.slippageBps,
      deadline,
      amountInRaw: amountInRaw.toString(),
      amountOutMinRaw: amountOutMinRaw.toString(),
      riskProfile: parsed.riskProfile,
      rationale,
      confidence,
      tags: ['yield-farmer', 'uniswap-v3', parsed.action],
    },
  });
}

export function buildExecutionPayloadWithDefaults(input: Omit<YieldIntent, 'slippageBps' | 'deadlineSeconds'> & Partial<Pick<YieldIntent, 'slippageBps' | 'deadlineSeconds'>>) {
  return buildExecutionPayload({
    ...input,
    slippageBps: input.slippageBps ?? EXECUTION_CONFIG.defaultSlippageBps,
    deadlineSeconds: input.deadlineSeconds ?? EXECUTION_CONFIG.defaultDeadlineSeconds,
  });
}
