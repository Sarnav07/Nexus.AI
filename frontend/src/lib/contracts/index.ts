/**
 * Nexus.AI Contract Configuration
 * Single source-of-truth for all deployed contract addresses and ABIs.
 * Chain: X Layer Testnet (chainId: 195)
 */

// ── Deployed Addresses ───────────────────────────────────────────────────────
export const CONTRACTS = {
  NexusVault:      '0x9DDa87f22F2a29D43b36417EA8eAEB1F68CFb689' as `0x${string}`,
  SignalRegistry:  '0x66B39854C90d9898dBEE1Aa1E24F541A731DC925' as `0x${string}`,
  AgentLeaderboard:'0xE606422f053Cbb2F1961CE761fEe8c2a06f4db60' as `0x${string}`,
  USDC:            '0x74b7f16337b8972027f6196a17a631ac6de26d22' as `0x${string}`,
  Treasury:        '0xbd598563ad2f462baa3f8da0e79c310ce03682c6' as `0x${string}`,
} as const;

// ── Signal Type keccak256 Constants ──────────────────────────────────────────
export const SIGNAL_TYPES = {
  MARKET_BUY:                 '0x67d6f0e2d2fd5c97f25c97c9cec9f75e2e31a5bedb3f6e23d85b3ffc6cf57bc4' as `0x${string}`,
  MARKET_SELL:                '0xb6d5a1d44a1a0e7a547feefa9fef8ff8d71bb4e3fc7abc4c9e2ae03e2af5b0e0' as `0x${string}`,
  UNISWAP_V3_ADD_LIQUIDITY:   '0x2da26e2c7e0eff6c15a73e6c228d3c2f7c2f74e8b1af5e5c8c3e8e2e1d6b7a9e' as `0x${string}`,
  UNISWAP_V3_REMOVE_LIQUIDITY:'0x9f4c2c3a8b7e6d5f4e3c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1' as `0x${string}`,
} as const;

// ── NexusVault ABI ────────────────────────────────────────────────────────────
export const NexusVaultABI = [
  // View functions
  { type: 'function', name: 'balances', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'highWaterMark', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalDeposits', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'paused', inputs: [], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'maxDrawdownBps', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'maxPositionSizeBps', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'authorizedAgents', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'usdc', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  {
    type: 'function', name: 'getRiskParams', inputs: [],
    outputs: [
      { name: 'drawdownBps', type: 'uint256' },
      { name: 'positionBps', type: 'uint256' },
      { name: 'isPaused', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'checkDrawdownLimit',
    inputs: [{ name: 'user', type: 'address' }, { name: 'proposedTradeUSDC', type: 'uint256' }],
    outputs: [{ name: 'ok', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'checkPositionSize',
    inputs: [{ name: 'proposedTradeUSDC', type: 'uint256' }],
    outputs: [{ name: 'ok', type: 'bool' }],
    stateMutability: 'view',
  },
  // Write functions
  { type: 'function', name: 'deposit', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'withdraw', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  // Events
  { type: 'event', name: 'Deposited', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'Withdrawn', inputs: [{ name: 'user', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'RiskLimitsUpdated', inputs: [{ name: 'maxDrawdownBps', type: 'uint256', indexed: false }, { name: 'maxPositionBps', type: 'uint256', indexed: false }] },
  // Custom errors
  { type: 'error', name: 'ZeroAmount', inputs: [] },
  { type: 'error', name: 'VaultPaused', inputs: [] },
  { type: 'error', name: 'InsufficientBalance', inputs: [{ name: 'available', type: 'uint256' }, { name: 'requested', type: 'uint256' }] },
  { type: 'error', name: 'NotAuthorizedAgent', inputs: [] },
  { type: 'error', name: 'ExceedsMaxDrawdown', inputs: [{ name: 'requested', type: 'uint256' }, { name: 'limit', type: 'uint256' }] },
  { type: 'error', name: 'ExceedsMaxPositionSize', inputs: [{ name: 'requested', type: 'uint256' }, { name: 'limit', type: 'uint256' }] },
] as const;

// ── AgentLeaderboard ABI ──────────────────────────────────────────────────────
export const AgentLeaderboardABI = [
  // View functions
  {
    type: 'function', name: 'agents',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'creatorWallet', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'startingBalanceUSDC', type: 'uint256' },
      { name: 'registrationTime', type: 'uint256' },
      { name: 'totalFeesCollected', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'getAgentPnL',
    inputs: [{ name: 'agentAddress', type: 'address' }],
    outputs: [
      { name: 'pnlBps', type: 'int256' },
      { name: 'startBalance', type: 'uint256' },
      { name: 'latestBalance', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'getLeaderboard',
    inputs: [],
    outputs: [
      { name: 'addrs', type: 'address[]' },
      { name: 'pnls', type: 'int256[]' },
      { name: 'names', type: 'string[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'snapshotHistory',
    inputs: [{ name: '', type: 'address' }, { name: '', type: 'uint256' }],
    outputs: [{ name: 'snapshotTime', type: 'uint256' }, { name: 'balanceAtSnapshot', type: 'uint256' }],
    stateMutability: 'view',
  },
  { type: 'function', name: 'agentList', inputs: [{ name: '', type: 'uint256' }], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
  { type: 'function', name: 'platformFeeBps', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  // Events
  {
    type: 'event', name: 'AgentRegistered',
    inputs: [
      { name: 'agentAddress', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'startingBalanceUSDC', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event', name: 'PnLSnapshotTaken',
    inputs: [
      { name: 'agentAddress', type: 'address', indexed: true },
      { name: 'balanceAtSnapshot', type: 'uint256', indexed: false },
      { name: 'pnlBps', type: 'int256', indexed: false },
    ],
  },
  // Custom errors
  { type: 'error', name: 'AgentAlreadyRegistered', inputs: [] },
  { type: 'error', name: 'AgentNotRegistered', inputs: [] },
  { type: 'error', name: 'ZeroAmount', inputs: [] },
] as const;

// ── SignalRegistry ABI ────────────────────────────────────────────────────────
export const SignalRegistryABI = [
  // View functions
  { type: 'function', name: 'totalSignalsLogged', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'authorizedAgents', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'SIG_MARKET_BUY', inputs: [], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'SIG_MARKET_SELL', inputs: [], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'SIG_UNISWAP_ADD_LIQ', inputs: [], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
  { type: 'function', name: 'SIG_UNISWAP_REMOVE_LIQ', inputs: [], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
  // Events
  {
    type: 'event', name: 'SignalLogged',
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
  // Custom errors
  { type: 'error', name: 'NotAuthorizedAgent', inputs: [] },
  { type: 'error', name: 'EmptySignalData', inputs: [] },
] as const;

// ── Minimal ERC20 ABI (for USDC approve + allowance + balanceOf) ──────────────
export const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'decimals', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'symbol', inputs: [], outputs: [{ name: '', type: 'string' }], stateMutability: 'view' },
] as const;

// ── Orchestrator API Base URL ─────────────────────────────────────────────────
export const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL || 'http://localhost:3001';

// ── X Layer Block Explorer ────────────────────────────────────────────────────
export const BLOCK_EXPLORER = 'https://www.oklink.com/xlayer-test';
export const getTxUrl = (hash: string) => `${BLOCK_EXPLORER}/tx/${hash}`;
export const getAddressUrl = (addr: string) => `${BLOCK_EXPLORER}/address/${addr}`;
