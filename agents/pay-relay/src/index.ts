import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createPublicClient, http, createWalletClient, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

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

import AgentLeaderboardABI from '../../../shared/abis/AgentLeaderboard.json' assert { type: 'json' };

const app = new Hono();
const port = process.env.PORT || 3004;

// Initialize Viem clients
const publicClient = createPublicClient({
  chain: xLayerTestnet,
  transport: http(),
});

// Check for private key
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.warn('⚠️  PRIVATE_KEY environment variable not set. Pay Relay Agent will run in read-only mode.');
}

const account = privateKey ? privateKeyToAccount(privateKey as `0x${string}`) : null;
const walletClient = account ? createWalletClient({
  account,
  chain: xLayerTestnet,
  transport: http(),
}) : null;

// CORS middleware
app.use('*', cors());

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok', agent: 'pay-relay', timestamp: Date.now() }));

// Route subscription fee endpoint
app.post('/api/route-subscription-fee', async (c) => {
  try {
    if (!walletClient) {
      return c.json({ error: 'Wallet not configured - missing PRIVATE_KEY' }, 500);
    }

    const { subscriberAddress, agentAddress, feeAmount } = await c.req.json();

    // Route subscription fee through AgentLeaderboard
    const hash = await walletClient.writeContract({
      address: CONTRACTS.AGENT_LEADERBOARD,
      abi: AgentLeaderboardABI.abi,
      functionName: 'routeSubscriptionFee',
      args: [subscriberAddress, agentAddress, BigInt(feeAmount)],
    });

    return c.json({
      success: true,
      transactionHash: hash,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error routing subscription fee:', error);
    return c.json({ error: 'Failed to route subscription fee' }, 500);
  }
});

// x402 payment endpoint
app.post('/api/x402-payment', async (c) => {
  try {
    const { from, to, amount, memo } = await c.req.json();

    // Placeholder for x402 payment logic
    // This would integrate with OnchainOS x402 payment skills

    return c.json({
      success: true,
      paymentId: `x402_${Date.now()}`,
      from,
      to,
      amount,
      memo,
      timestamp: Date.now(),
      message: 'x402 payment processing - to be implemented with OnchainOS skills'
    });
  } catch (error) {
    console.error('Error processing x402 payment:', error);
    return c.json({ error: 'Failed to process x402 payment' }, 500);
  }
});

// Get leaderboard with fees endpoint
app.get('/api/leaderboard-with-fees', async (c) => {
  try {
    const leaderboard = await publicClient.readContract({
      address: CONTRACTS.AGENT_LEADERBOARD,
      abi: AgentLeaderboardABI.abi,
      functionName: 'getLeaderboard',
      args: [],
    });

    return c.json({
      agents: leaderboard,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return c.json({ error: 'Failed to get leaderboard' }, 500);
  }
});

console.log(`Nexus Pay Relay Agent starting on port ${port}...`);

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