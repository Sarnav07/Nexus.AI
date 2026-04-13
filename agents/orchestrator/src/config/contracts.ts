import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Deployed Contract Addresses ─────────────────────────────────────────────
export const CONTRACTS = {
  NexusVault: '0x9DDa87f22F2a29D43b36417EA8eAEB1F68CFb689' as const,
  SignalRegistry: '0x66B39854C90d9898dBEE1Aa1E24F541A731DC925' as const,
  AgentLeaderboard: '0xE606422f053Cbb2F1961CE761fEe8c2a06f4db60' as const,
  USDC: '0x74b7f16337b8972027f6196a17a631ac6de26d22' as const,
  Treasury: '0xbd598563ad2f462baa3f8da0e79c310ce03682c6' as const,
} as const;

// ── ABI Loader ──────────────────────────────────────────────────────────────
function loadAbi(filename: string) {
  const abiPath = join(__dirname, '..', '..', '..', 'shared', 'abis', filename);
  return JSON.parse(readFileSync(abiPath, 'utf-8'));
}

export const NexusVaultABI = loadAbi('NexusVault.json');
export const SignalRegistryABI = loadAbi('SignalRegistry.json');
export const AgentLeaderboardABI = loadAbi('AgentLeaderboard.json');

// ── Signal Type Constants (pre-computed keccak256 hashes) ───────────────────
import { keccak256, toHex } from 'viem';

export const SIGNAL_TYPES = {
  MARKET_BUY: keccak256(toHex('MARKET_BUY')),
  MARKET_SELL: keccak256(toHex('MARKET_SELL')),
  UNISWAP_V3_ADD_LIQUIDITY: keccak256(toHex('UNISWAP_V3_ADD_LIQUIDITY')),
  UNISWAP_V3_REMOVE_LIQUIDITY: keccak256(toHex('UNISWAP_V3_REMOVE_LIQUIDITY')),
} as const;
