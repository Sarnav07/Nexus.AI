import { createPublicClient, http, defineChain } from 'viem';

// X Layer Testnet chain definition
export const xLayerTestnet = defineChain({
  id: 195,
  name: 'X Layer Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'OKB',
    symbol: 'OKB',
  },
  rpcUrls: {
    default: {
      http: [process.env.X_LAYER_RPC_URL || 'https://testrpc.xlayer.tech'],
    },
  },
  blockExplorers: {
    default: {
      name: 'X Layer Testnet Explorer',
      url: 'https://www.oklink.com/xlayer-test',
    },
  },
  testnet: true,
});

// Singleton public client for read-only contract calls
let _publicClient: ReturnType<typeof createPublicClient> | null = null;

export function getPublicClient() {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: xLayerTestnet,
      transport: http(process.env.X_LAYER_RPC_URL || 'https://testrpc.xlayer.tech'),
    });
  }
  return _publicClient;
}
