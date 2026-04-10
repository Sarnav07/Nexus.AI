import { tool } from 'ai';
import { z } from 'zod';
import { teeWalletService } from '../services/onchainos-wallet.js';
import { createPublicClient, http, type Hex, type Address } from 'viem';
import { xLayerTestnet } from '../config/chain.js';

export const signAndExecuteTrade = tool({
  description: 'Submit an execution payload to the OnchainOS TEE Wallet for programmatic signature and broadcasting to X Layer.',
  parameters: z.object({
    executionPayload: z.object({
      idempotencyKey: z.string(),
      chainId: z.number(),
      target: z.string(),
      data: z.string(),
      value: z.string(),
      tickRange: z.any().optional(),
      metadata: z.any().optional(),
    }),
    signalIntent: z.object({
      preTradeSignal: z.any(),
      encodedCall: z.object({
        to: z.string(),
        data: z.string()
      })
    })
  }),
  execute: async ({ executionPayload, signalIntent }) => {
    try {
      console.log(`\n🤖 [Orchestrator] Sending payload ${executionPayload.idempotencyKey.slice(0, 10)} to OnchainOS TEE Wallet...`);

      // 1. Programmatically sign and broadcast the SignalRegistry intent first
      console.log(`[Orchestrator] 1️⃣ Broadcasting SignalRegistry log...`);
      const signalResult = await teeWalletService.signAndBroadcast({
        to: signalIntent.encodedCall.to as Address,
        data: signalIntent.encodedCall.data as Hex,
        value: 0n,
      });

      if (!signalResult.success) {
        return {
          success: false,
          message: `Failed to log signal to SignalRegistry: ${signalResult.error}`,
        };
      }

      // 2. Programmatically sign and broadcast the execution payload
      console.log(`[Orchestrator] 2️⃣ Broadcasting Execution payload to Uniswap/Target...`);
      const executeResult = await teeWalletService.signAndBroadcast({
        to: executionPayload.target as Address,
        data: executionPayload.data as Hex,
        value: BigInt(executionPayload.value),
      });

      if (!executeResult.success) {
        return {
          success: false,
          message: `Signal logged successfully (${signalResult.txHash}), but Trade execution failed: ${executeResult.error}`,
        };
      }

      return {
        success: true,
        message: 
          `✅ Trade Execution Complete (programmatically signed by TEE Wallet):\n` +
          `  📡 Signal tx: ${signalResult.txHash}\n` +
          `  💰 Trade tx: ${executeResult.txHash}\n` +
          `  🤖 Agent Wallet: ${teeWalletService.address}`,
        signalTxHash: signalResult.txHash,
        tradeTxHash: executeResult.txHash,
      };
    } catch (e: any) {
      return {
        success: false,
        message: `System error during execution: ${e.message}`,
      };
    }
  },
});
