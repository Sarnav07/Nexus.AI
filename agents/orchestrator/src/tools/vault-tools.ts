import { tool } from 'ai';
import { z } from 'zod';
import { getPublicClient } from '../config/chain.js';
import { CONTRACTS, NexusVaultABI } from '../config/contracts.js';
import { formatUnits } from 'viem';

// ── Check Vault Balance ─────────────────────────────────────────────────────
export const checkBalance = tool({
  description:
    'Check the USDC balance of a user in the NexusVault. Returns the deposited balance in USDC.',
  parameters: z.object({
    userAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .describe('Ethereum address of the user'),
  }),
  execute: async ({ userAddress }) => {
    const client = getPublicClient();
    const balance = (await client.readContract({
      address: CONTRACTS.NexusVault,
      abi: NexusVaultABI,
      functionName: 'balances',
      args: [userAddress as `0x${string}`],
    })) as bigint;

    const formatted = formatUnits(balance, 6); // USDC has 6 decimals
    return {
      userAddress,
      balanceRaw: balance.toString(),
      balanceUSDC: formatted,
      message: `Vault balance for ${userAddress}: ${formatted} USDC`,
    };
  },
});

// ── Get Risk Parameters ─────────────────────────────────────────────────────
export const checkRiskParams = tool({
  description:
    'Get the current risk parameters from the NexusVault: max drawdown (bps), max position size (bps), and pause status.',
  parameters: z.object({}),
  execute: async () => {
    const client = getPublicClient();
    const result = (await client.readContract({
      address: CONTRACTS.NexusVault,
      abi: NexusVaultABI,
      functionName: 'getRiskParams',
    })) as [bigint, bigint, boolean];

    return {
      maxDrawdownBps: Number(result[0]),
      maxDrawdownPercent: (Number(result[0]) / 100).toFixed(2) + '%',
      maxPositionSizeBps: Number(result[1]),
      maxPositionSizePercent: (Number(result[1]) / 100).toFixed(2) + '%',
      isPaused: result[2],
      message: `Risk params — Max Drawdown: ${(Number(result[0]) / 100).toFixed(2)}%, Max Position: ${(Number(result[1]) / 100).toFixed(2)}%, Paused: ${result[2]}`,
    };
  },
});

// ── Check Drawdown Limit ────────────────────────────────────────────────────
export const checkDrawdownLimit = tool({
  description:
    'Check if a proposed trade amount passes the drawdown limit for a given user. Returns true if the trade is within limits.',
  parameters: z.object({
    userAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/)
      .describe('User wallet address'),
    tradeAmountUSDC: z
      .number()
      .positive()
      .describe('Trade amount in USDC (human-readable, e.g. 100 for $100)'),
  }),
  execute: async ({ userAddress, tradeAmountUSDC }) => {
    const client = getPublicClient();
    const amountRaw = BigInt(Math.floor(tradeAmountUSDC * 1e6));

    const ok = (await client.readContract({
      address: CONTRACTS.NexusVault,
      abi: NexusVaultABI,
      functionName: 'checkDrawdownLimit',
      args: [userAddress as `0x${string}`, amountRaw],
    })) as boolean;

    return {
      userAddress,
      tradeAmountUSDC,
      withinDrawdownLimit: ok,
      message: ok
        ? `✅ Trade of $${tradeAmountUSDC} USDC is within drawdown limits.`
        : `❌ Trade of $${tradeAmountUSDC} USDC exceeds drawdown limits for this user.`,
    };
  },
});

// ── Check Position Size ─────────────────────────────────────────────────────
export const checkPositionSize = tool({
  description:
    'Check if a proposed trade amount passes the position size limit. Returns true if within limits.',
  parameters: z.object({
    tradeAmountUSDC: z
      .number()
      .positive()
      .describe('Trade amount in USDC (human-readable)'),
  }),
  execute: async ({ tradeAmountUSDC }) => {
    const client = getPublicClient();
    const amountRaw = BigInt(Math.floor(tradeAmountUSDC * 1e6));

    const ok = (await client.readContract({
      address: CONTRACTS.NexusVault,
      abi: NexusVaultABI,
      functionName: 'checkPositionSize',
      args: [amountRaw],
    })) as boolean;

    return {
      tradeAmountUSDC,
      withinPositionSizeLimit: ok,
      message: ok
        ? `✅ Position size of $${tradeAmountUSDC} USDC is within limits.`
        : `❌ Position size of $${tradeAmountUSDC} USDC exceeds maximum allowed.`,
    };
  },
});

// ── Get Total Deposits ──────────────────────────────────────────────────────
export const getTotalDeposits = tool({
  description:
    'Get the total USDC deposited across all users in the NexusVault.',
  parameters: z.object({}),
  execute: async () => {
    const client = getPublicClient();
    const total = (await client.readContract({
      address: CONTRACTS.NexusVault,
      abi: NexusVaultABI,
      functionName: 'totalDeposits',
    })) as bigint;

    const formatted = formatUnits(total, 6);
    return {
      totalDepositsRaw: total.toString(),
      totalDepositsUSDC: formatted,
      message: `Total vault deposits: ${formatted} USDC`,
    };
  },
});
