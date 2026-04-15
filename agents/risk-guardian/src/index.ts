import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';

// Chain configuration
const xLayerTestnet = defineChain({
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

const CONTRACTS = {
  NEXUS_VAULT: '0x9DDa87f22F2a29D43b36417EA8eAEB1F68CFb689',
  SIGNAL_REGISTRY: '0x66B39854C90d9898dBEE1Aa1E24F541A731DC925',
  AGENT_LEADERBOARD: '0xE606422f053Cbb2F1961CE761fEe8c2a06f4db60',
};

import NexusVaultABI from '../../../shared/abis/NexusVault.json' assert { type: 'json' };

const app = new Hono();
const port = process.env.PORT || 3003;

// Initialize Viem client
const publicClient = createPublicClient({
  chain: xLayerTestnet,
  transport: http(),
});

// CORS middleware
app.use('*', cors());

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok', agent: 'risk-guardian', timestamp: Date.now() }));

// Risk validation endpoint
app.post('/api/validate-trade', async (c) => {
  try {
    const { userAddress, tradeAmount } = await c.req.json();

    // Check drawdown limit
    const drawdownOk = await publicClient.readContract({
      address: CONTRACTS.NEXUS_VAULT,
      abi: NexusVaultABI.abi,
      functionName: 'checkDrawdownLimit',
      args: [userAddress, BigInt(tradeAmount)],
    });

    // Check position size
    const positionOk = await publicClient.readContract({
      address: CONTRACTS.NEXUS_VAULT,
      abi: NexusVaultABI.abi,
      functionName: 'checkPositionSize',
      args: [BigInt(tradeAmount)],
    });

    return c.json({
      approved: drawdownOk && positionOk,
      drawdownOk,
      positionOk,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error validating trade:', error);
    return c.json({ error: 'Failed to validate trade' }, 500);
  }
});

// Risk parameters endpoint
app.get('/api/risk-params', async (c) => {
  try {
    const [drawdownBps, positionBps, isPaused] = await publicClient.readContract({
      address: CONTRACTS.NEXUS_VAULT,
      abi: NexusVaultABI.abi,
      functionName: 'getRiskParams',
      args: [],
    });

    return c.json({
      drawdownBps: Number(drawdownBps),
      positionBps: Number(positionBps),
      isPaused,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error getting risk params:', error);
    return c.json({ error: 'Failed to get risk parameters' }, 500);
  }
});

console.log(`Nexus Risk Guardian Agent starting on port ${port}...`);

// Start the server
export default {
  port,
  fetch: app.fetch,
};

// For development with tsx, also start the server manually
if (import.meta.main) {
  const { serve } = await import('@hono/node-server');
  serve({
    fetch: app.fetch,
    port: Number(port),
  });
}