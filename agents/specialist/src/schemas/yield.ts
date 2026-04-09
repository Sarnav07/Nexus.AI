import { z } from 'zod';
import { addressSchema, positiveNumber, riskProfileSchema } from './common.js';

export const actionSchema = z.enum(['market_buy', 'market_sell', 'add_liquidity', 'remove_liquidity']);

export const yieldIntentSchema = z.object({
  action: actionSchema,
  tokenIn: z.string(),
  tokenOut: z.string(),
  amountUSDC: positiveNumber,
  feeTier: z.union([z.literal(100), z.literal(500), z.literal(3000), z.literal(10000)]).default(3000),
  riskProfile: riskProfileSchema.default('balanced'),
  slippageBps: z.number().int().min(1).max(1000).default(50),
  deadlineSeconds: z.number().int().min(60).max(7200).default(1200),
  referenceTick: z.number().int().default(0),
  volatilityBps: z.number().int().min(10).max(5000).default(400),
  userAddress: addressSchema.optional(),
});

export const tickRangeSchema = z.object({
  tickLower: z.number().int(),
  tickUpper: z.number().int(),
  tickSpacing: z.number().int().positive(),
});

export const executionMetadataSchema = z.object({
  action: actionSchema,
  tokenIn: z.string(),
  tokenOut: z.string(),
  tokenInAddress: addressSchema,
  tokenOutAddress: addressSchema,
  feeTier: z.number().int(),
  slippageBps: z.number().int(),
  deadline: z.number().int(),
  amountInRaw: z.string(),
  amountOutMinRaw: z.string(),
  riskProfile: riskProfileSchema,
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string()).min(1),
});

export const executionBundleSchema = z.object({
  idempotencyKey: z.string().min(16),
  chainId: z.number().int().positive(),
  target: addressSchema,
  data: z.string().startsWith('0x'),
  value: z.string(),
  tickRange: tickRangeSchema,
  metadata: executionMetadataSchema,
});

export type YieldIntent = z.infer<typeof yieldIntentSchema>;
export type ExecutionBundle = z.infer<typeof executionBundleSchema>;
export type TickRange = z.infer<typeof tickRangeSchema>;
