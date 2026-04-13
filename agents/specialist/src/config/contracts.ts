import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keccak256, toHex } from 'viem';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const CONTRACTS = {
  NexusVault: '0x9DDa87f22F2a29D43b36417EA8eAEB1F68CFb689' as const,
  SignalRegistry: '0x66B39854C90d9898dBEE1Aa1E24F541A731DC925' as const,
  AgentLeaderboard: '0xE606422f053Cbb2F1961CE761fEe8c2a06f4db60' as const,
  USDC: '0x74b7f16337b8972027f6196a17a631ac6de26d22' as const,
} as const;

export const X_LAYER_TESTNET = {
  chainId: 1952,
  rpcUrl: process.env.X_LAYER_RPC_URL || 'https://testrpc.xlayer.tech',
} as const;

function loadAbi(filename: string) {
  const abiPath = join(__dirname, '..', '..', '..', 'shared', 'abis', filename);
  return JSON.parse(readFileSync(abiPath, 'utf-8'));
}

export const NexusVaultABI = loadAbi('NexusVault.json');
export const SignalRegistryABI = loadAbi('SignalRegistry.json');
export const AgentLeaderboardABI = loadAbi('AgentLeaderboard.json');

export const SIGNAL_TYPES = {
  MARKET_BUY: keccak256(toHex('MARKET_BUY')),
  MARKET_SELL: keccak256(toHex('MARKET_SELL')),
  UNISWAP_V3_ADD_LIQUIDITY: keccak256(toHex('UNISWAP_V3_ADD_LIQUIDITY')),
  UNISWAP_V3_REMOVE_LIQUIDITY: keccak256(toHex('UNISWAP_V3_REMOVE_LIQUIDITY')),
} as const;

export type SignalTypeName = keyof typeof SIGNAL_TYPES;
