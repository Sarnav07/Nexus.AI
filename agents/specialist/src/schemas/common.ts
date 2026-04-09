import { z } from 'zod';

export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
export const tokenSchema = z.string().min(2);
export const positiveNumber = z.number().positive();
export const unixTimestampSchema = z.number().int().positive();

export const riskProfileSchema = z.enum(['conservative', 'balanced', 'aggressive']);

export const executionPayloadSchema = z.object({
  idempotencyKey: z.string().min(16),
  chainId: z.number().int().positive(),
  target: addressSchema,
  data: z.string().startsWith('0x'),
  value: z.string(),
  metadata: z.record(z.unknown()),
});

export type ExecutionPayload = z.infer<typeof executionPayloadSchema>;
