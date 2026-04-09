import { z } from 'zod';

// ── Ethereum address validation ─────────────────────────────────────────────
export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

// ── Intent Schemas ──────────────────────────────────────────────────────────

export const DepositIntentSchema = z.object({
  action: z.literal('deposit'),
  amountUSDC: z.number().positive().describe('Amount of USDC to deposit'),
  userAddress: addressSchema.describe('User wallet address'),
});

export const WithdrawIntentSchema = z.object({
  action: z.literal('withdraw'),
  amountUSDC: z.number().positive().describe('Amount of USDC to withdraw'),
  userAddress: addressSchema.describe('User wallet address'),
});

export const TradeIntentSchema = z.object({
  action: z.enum(['market_buy', 'market_sell']),
  tokenIn: z.string().describe('Token to sell (symbol or address)'),
  tokenOut: z.string().describe('Token to buy (symbol or address)'),
  amountUSDC: z.number().positive().describe('Trade size in USDC'),
  userAddress: addressSchema.describe('User wallet address'),
});

export const AddLiquidityIntentSchema = z.object({
  action: z.literal('add_liquidity'),
  tokenA: z.string().describe('First token (symbol or address)'),
  tokenB: z.string().describe('Second token (symbol or address)'),
  amountUSDC: z.number().positive().describe('Amount of USDC to allocate'),
  priceRangeLower: z.number().optional().describe('Lower price bound (optional)'),
  priceRangeUpper: z.number().optional().describe('Upper price bound (optional)'),
  userAddress: addressSchema.describe('User wallet address'),
});

export const RemoveLiquidityIntentSchema = z.object({
  action: z.literal('remove_liquidity'),
  tokenA: z.string().describe('First token'),
  tokenB: z.string().describe('Second token'),
  percentageToRemove: z.number().min(1).max(100).describe('Percentage of LP to remove'),
  userAddress: addressSchema.describe('User wallet address'),
});

export const CheckBalanceIntentSchema = z.object({
  action: z.literal('check_balance'),
  userAddress: addressSchema.describe('User wallet address'),
});

export const ViewLeaderboardIntentSchema = z.object({
  action: z.literal('view_leaderboard'),
});

export const ViewSignalsIntentSchema = z.object({
  action: z.literal('view_signals'),
  limit: z.number().int().positive().default(10).describe('Number of recent signals'),
});

// ── Union type ──────────────────────────────────────────────────────────────
export const IntentSchema = z.discriminatedUnion('action', [
  DepositIntentSchema,
  WithdrawIntentSchema,
  TradeIntentSchema,
  AddLiquidityIntentSchema,
  RemoveLiquidityIntentSchema,
  CheckBalanceIntentSchema,
  ViewLeaderboardIntentSchema,
  ViewSignalsIntentSchema,
]);

export type Intent = z.infer<typeof IntentSchema>;
