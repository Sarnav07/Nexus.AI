import { z } from 'zod';

export const TradePayloadSchema = z.object({
    idempotencyKey: z.string().optional(),
    chainId: z.number().int(),
    target: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Valid Ethereum address for target required"),
    data: z.string(),
    value: z.string().optional().default("0"),
    tickRange: z.object({
        lower: z.number(),
        upper: z.number(),
    }).optional(),
    metadata: z.object({
        tokenIn: z.string() /*.regex(/^0x[a-fA-F0-9]{40}$/)*/, // Temporarily flexible based on specialist payload
        amountInRaw: z.string(),
    }).passthrough(),
});

export type TradePayload = z.infer<typeof TradePayloadSchema>;
