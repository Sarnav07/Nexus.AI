import { http, createConfig } from 'wagmi';
import { defineChain } from 'viem';
import { injected } from 'wagmi/connectors';

// ── X Layer Testnet Chain Definition ─────────────────────────────────────────
export const xLayerTestnet = defineChain({
  id: 1952,
  name: 'X Layer Testnet',
  nativeCurrency: { decimals: 18, name: 'OKB', symbol: 'OKB' },
  rpcUrls: {
    default: { http: ['https://testrpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'OKX X Layer Testnet', url: 'https://www.okx.com/explorer/xlayer-testnet' },
  },
  testnet: true,
});

// ── Wagmi Config ──────────────────────────────────────────────────────────────
// Only injected() — it auto-detects MetaMask, Rabby, OKX, Coinbase, etc.
// metaMask() was removed: it creates a duplicate entry alongside injected().
export const wagmiConfig = createConfig({
  autoConnect: false,  // Disable auto-connect to allow manual wallet selection after disconnect
  chains: [xLayerTestnet],
  connectors: [injected()],
  transports: {
    [xLayerTestnet.id]: http('https://testrpc.xlayer.tech'),
  },
});

export type SupportedChainId = typeof xLayerTestnet.id;
export const SUPPORTED_CHAIN_ID: SupportedChainId = 1952;

