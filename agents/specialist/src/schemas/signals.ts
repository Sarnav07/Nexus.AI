import { z } from 'zod';
import { addressSchema } from './common.js';

export const signalTypeSchema = z.enum([
  'MARKET_BUY',
  'MARKET_SELL',
  'UNISWAP_V3_ADD_LIQUIDITY',
  'UNISWAP_V3_REMOVE_LIQUIDITY',
]);

export const signalIntentSchema = z.object({
  signalType: signalTypeSchema,
  tokenIn: addressSchema,
  tokenOut: addressSchema,
  amountIn: z.string(),
  tickLower: z.number().int().default(0),
  tickUpper: z.number().int().default(0),
});

export const encodedCallSchema = z.object({
  target: addressSchema,
  data: z.string().startsWith('0x'),
  value: z.string(),
});

export const preTradeSignalSchema = z.object({
  agentAddress: addressSchema.optional(),
  signalType: signalTypeSchema,
  signalTypeHash: z.string().startsWith('0x'),
  tokenIn: addressSchema,
  tokenOut: addressSchema,
  amountIn: z.string(),
  tickLower: z.number().int(),
  tickUpper: z.number().int(),
  timestamp: z.number().int().positive(),
});

export const signalPayloadOutputSchema = z.object({
  preTradeSignal: preTradeSignalSchema,
  encodedCall: encodedCallSchema,
});

export const signalBatchPayloadOutputSchema = z.object({
  signals: z.array(preTradeSignalSchema).min(1),
  encodedCall: encodedCallSchema,
});

export type SignalIntent = z.infer<typeof signalIntentSchema>;
export type SignalPayloadOutput = z.infer<typeof signalPayloadOutputSchema>;
export type SignalBatchPayloadOutput = z.infer<typeof signalBatchPayloadOutputSchema>;
