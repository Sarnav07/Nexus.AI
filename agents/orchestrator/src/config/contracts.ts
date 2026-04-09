import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Deployed Contract Addresses ─────────────────────────────────────────────
export const CONTRACTS = {
  NexusVault: '0x7b6483fbb5d1716a1e26cb9d99257673dfd6eee7' as const,
  SignalRegistry: '0x1c9118addb2f3308396ce3412dd440771442b8af' as const,
  AgentLeaderboard: '0xaaa0f4583d3529aa9a99b736f7971983f16e7972' as const,
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
