import { defineChain } from 'viem';

export const xLayerTestnet = defineChain({
  id: 1952,
  name: 'X Layer Testnet',
  network: 'x-layer-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'OKB',
    symbol: 'OKB',
  },
  rpcUrls: {
    default: {
      http: ['https://testrpc.xlayer.tech'],
    },
    public: {
      http: ['https://testrpc.xlayer.tech'],
    },
  },
  blockExplorers: {
    default: { name: 'X Layer Explorer', url: 'https://www.okx.com/explorer/xlayer-testnet' },
  },
  testnet: true,
});

export const CONTRACTS = {
  NEXUS_VAULT: '0x9DDa87f22F2a29D43b36417EA8eAEB1F68CFb689',
  SIGNAL_REGISTRY: '0x66B39854C90d9898dBEE1Aa1E24F541A731DC925',
  AGENT_LEADERBOARD: '0xE606422f053Cbb2F1961CE761fEe8c2a06f4db60',
  USDG: '0xA78E2baaBaf5c4f36b7Fc394725Deb68D332EeC1', // USDG contract address on X Layer testnet
} as const;