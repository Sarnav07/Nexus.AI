import { tool } from 'ai';
import { z } from 'zod';
import { getPublicClient } from '../config/chain.js';
import { CONTRACTS, AgentLeaderboardABI } from '../config/contracts.js';
import { formatUnits } from 'viem';

// ── Get Leaderboard ─────────────────────────────────────────────────────────
export const getLeaderboard = tool({
  description:
    'Get the ranked leaderboard of all registered AI agents with their PnL performance in basis points and names.',
  parameters: z.object({}),
  execute: async () => {
    const client = getPublicClient();

    const result = (await client.readContract({
      address: CONTRACTS.AgentLeaderboard,
      abi: AgentLeaderboardABI,
      functionName: 'getLeaderboard',
    })) as [string[], bigint[], string[]];

    const [addresses, pnls, names] = result;

    const agents = addresses.map((addr, i) => ({
      rank: i + 1,
      address: addr,
      name: names[i],
      pnlBps: Number(pnls[i]),
      pnlPercent: (Number(pnls[i]) / 100).toFixed(2) + '%',
    }));

    // Sort by PnL descending
    agents.sort((a, b) => b.pnlBps - a.pnlBps);
    agents.forEach((a, i) => (a.rank = i + 1));

    return {
      totalAgents: agents.length,
      agents,
      message:
        agents.length === 0
          ? 'No agents registered on the leaderboard yet.'
          : `Leaderboard (${agents.length} agents):\n` +
            agents
              .map((a) => `#${a.rank} ${a.name} (${a.pnlPercent})`)
              .join('\n'),
    };
  },
});

// ── Get Agent PnL ───────────────────────────────────────────────────────────
export const getAgentPnL = tool({
  description:
    'Get detailed PnL (profit and loss) data for a specific AI agent by address. Returns PnL in basis points, starting balance, and latest balance.',
  parameters: z.object({
    agentAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .describe('Address of the AI agent'),
  }),
  execute: async ({ agentAddress }) => {
    const client = getPublicClient();

    const result = (await client.readContract({
      address: CONTRACTS.AgentLeaderboard,
      abi: AgentLeaderboardABI,
      functionName: 'getAgentPnL',
      args: [agentAddress as `0x${string}`],
    })) as [bigint, bigint, bigint];

    const [pnlBps, startBalance, latestBalance] = result;

    return {
      agentAddress,
      pnlBps: Number(pnlBps),
      pnlPercent: (Number(pnlBps) / 100).toFixed(2) + '%',
      startBalanceUSDC: formatUnits(startBalance, 6),
      latestBalanceUSDC: formatUnits(latestBalance, 6),
      message: `Agent ${agentAddress} — PnL: ${(Number(pnlBps) / 100).toFixed(2)}%, Start: ${formatUnits(startBalance, 6)} USDC, Current: ${formatUnits(latestBalance, 6)} USDC`,
    };
  },
});

// ── Get Agent Details ───────────────────────────────────────────────────────
export const getAgentDetails = tool({
  description:
    'Get detailed information about a registered AI agent including name, creator wallet, starting balance, registration time, and fees collected.',
  parameters: z.object({
    agentAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .describe('Address of the AI agent'),
  }),
  execute: async ({ agentAddress }) => {
    const client = getPublicClient();

    const result = (await client.readContract({
      address: CONTRACTS.AgentLeaderboard,
      abi: AgentLeaderboardABI,
      functionName: 'agents',
      args: [agentAddress as `0x${string}`],
    })) as [string, string, bigint, bigint, bigint, boolean];

    const [creatorWallet, name, startingBalance, registrationTime, totalFees, isActive] = result;

    return {
      agentAddress,
      creatorWallet,
      name,
      startingBalanceUSDC: formatUnits(startingBalance, 6),
      registrationTime: new Date(Number(registrationTime) * 1000).toISOString(),
      totalFeesCollectedUSDC: formatUnits(totalFees, 6),
      isActive,
      message: `Agent "${name}" — Creator: ${creatorWallet}, Active: ${isActive}, Fees earned: ${formatUnits(totalFees, 6)} USDC`,
    };
  },
});
