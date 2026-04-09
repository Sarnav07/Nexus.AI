import { tool } from 'ai';
import { z } from 'zod';
import { getPublicClient } from '../config/chain.js';
import { CONTRACTS, SignalRegistryABI } from '../config/contracts.js';

// ── Get Total Signals Logged ────────────────────────────────────────────────
export const getTotalSignals = tool({
  description:
    'Get the total number of trade signals logged on-chain via the SignalRegistry.',
  parameters: z.object({}),
  execute: async () => {
    const client = getPublicClient();

    const total = (await client.readContract({
      address: CONTRACTS.SignalRegistry,
      abi: SignalRegistryABI,
      functionName: 'totalSignalsLogged',
    })) as bigint;

    // Note: actual count is totalSignalsLogged - 1 (gas optimization in contract)
    const actualCount = Number(total) > 0 ? Number(total) - 1 : 0;

    return {
      totalSignalsRaw: Number(total),
      totalSignals: actualCount,
      message: `Total trade signals logged on-chain: ${actualCount}`,
    };
  },
});

// ── Get Recent Signals (via event logs) ─────────────────────────────────────
export const getRecentSignals = tool({
  description:
    'Fetch recent trade signals from the SignalRegistry by reading on-chain event logs. Returns the most recent signals with agent address, signal type, tokens, and amounts.',
  parameters: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe('Number of recent signals to fetch (max 50)'),
  }),
  execute: async ({ limit }) => {
    const client = getPublicClient();

    try {
      const currentBlock = await client.getBlockNumber();
      // Look back ~10000 blocks (~2.7 hours at 1s block time)
      const fromBlock = currentBlock > 10000n ? currentBlock - 10000n : 0n;

      const logs = await client.getLogs({
        address: CONTRACTS.SignalRegistry,
        event: {
          type: 'event',
          name: 'SignalLogged',
          inputs: [
            { name: 'agentAddress', type: 'address', indexed: true },
            { name: 'signalType', type: 'bytes32', indexed: true },
            { name: 'tokenIn', type: 'address', indexed: true },
            { name: 'tokenOut', type: 'address', indexed: false },
            { name: 'amountIn', type: 'uint256', indexed: false },
            { name: 'tickLower', type: 'int24', indexed: false },
            { name: 'tickUpper', type: 'int24', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
          ],
        },
        fromBlock,
        toBlock: currentBlock,
      });

      const signals = logs
        .slice(-limit)
        .reverse()
        .map((log) => ({
          agentAddress: log.args.agentAddress,
          signalType: log.args.signalType,
          tokenIn: log.args.tokenIn,
          tokenOut: log.args.tokenOut,
          amountIn: log.args.amountIn?.toString(),
          tickLower: log.args.tickLower,
          tickUpper: log.args.tickUpper,
          timestamp: log.args.timestamp ? new Date(Number(log.args.timestamp) * 1000).toISOString() : undefined,
          blockNumber: log.blockNumber?.toString(),
        }));

      return {
        count: signals.length,
        signals,
        message:
          signals.length === 0
            ? 'No recent trade signals found in the last ~10,000 blocks.'
            : `Found ${signals.length} recent signal(s).`,
      };
    } catch (error) {
      return {
        count: 0,
        signals: [],
        message: 'Unable to fetch recent signals. The RPC may not support log queries over this range.',
        error: String(error),
      };
    }
  },
});
