import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamChat, chat } from './agent/orchestrator.js';
import type { CoreMessage } from 'ai';
import { getPublicClient } from './config/chain.js';
import { CONTRACTS, NexusVaultABI, AgentLeaderboardABI, SignalRegistryABI } from './config/contracts.js';
import { formatUnits } from 'viem';

const app = new Hono();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// ── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'nexus-orchestrator',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Streaming Chat Endpoint ─────────────────────────────────────────────────
app.post('/api/chat', async (c) => {
  try {
    const body = await c.req.json();
    const messages: CoreMessage[] = body.messages || [];

    if (!messages.length) {
      return c.json({ error: 'No messages provided' }, 400);
    }

    console.log('Received chat request with messages:', messages.length);

    const result = await streamChat(messages);

    console.log('Stream chat result obtained');

    // Convert the async iterable text stream to a ReadableStream<Uint8Array>
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            console.log('Sending chunk:', chunk);
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (err) {
          console.error('Error in stream:', err);
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat error:', error);

    // Check for quota exceeded error
    const errorMessage = String(error);
    if (errorMessage.includes('quota') || errorMessage.includes('Quota exceeded')) {
      return c.json(
        {
          error: 'API Quota Exceeded',
          details: 'The AI service quota has been reached. Please try again later or contact support for increased limits.',
          retryAfter: 60 // seconds
        },
        429, // Too Many Requests
      );
    }

    return c.json(
      { error: 'Failed to process chat request', details: errorMessage },
      500,
    );
  }
});

// ── Non-streaming Chat Endpoint ─────────────────────────────────────────────
app.post('/api/chat/complete', async (c) => {
  try {
    const body = await c.req.json();
    const messages: CoreMessage[] = body.messages || [];

    if (!messages.length) {
      return c.json({ error: 'No messages provided' }, 400);
    }

    const result = await chat(messages);
    return c.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    return c.json(
      { error: 'Failed to process chat request', details: String(error) },
      500,
    );
  }
});

// ── Direct Leaderboard Endpoint ─────────────────────────────────────────────
app.get('/api/leaderboard', async (c) => {
  try {
    const client = getPublicClient();
    const result = (await client.readContract({
      address: CONTRACTS.AgentLeaderboard,
      abi: AgentLeaderboardABI,
      functionName: 'getLeaderboard',
    })) as [string[], bigint[], string[]];

    const [addresses, pnls, names] = result;

    const agents = addresses
      .map((addr, i) => ({
        address: addr,
        name: names[i],
        pnlBps: Number(pnls[i]),
        pnlPercent: (Number(pnls[i]) / 100).toFixed(2) + '%',
      }))
      .sort((a, b) => b.pnlBps - a.pnlBps)
      .map((a, i) => ({ rank: i + 1, ...a }));

    return c.json({ agents, totalAgents: agents.length });
  } catch (error) {
    return c.json({ error: 'Failed to fetch leaderboard', details: String(error) }, 500);
  }
});

// ── Direct Vault Balance Endpoint ───────────────────────────────────────────
app.get('/api/vault/:address', async (c) => {
  try {
    const userAddress = c.req.param('address');
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return c.json({ error: 'Invalid address format' }, 400);
    }

    const client = getPublicClient();

    const [balance, highWaterMark, totalDeposits, riskParams] = await Promise.all([
      client.readContract({
        address: CONTRACTS.NexusVault,
        abi: NexusVaultABI,
        functionName: 'balances',
        args: [userAddress as `0x${string}`],
      }) as Promise<bigint>,
      client.readContract({
        address: CONTRACTS.NexusVault,
        abi: NexusVaultABI,
        functionName: 'highWaterMark',
        args: [userAddress as `0x${string}`],
      }) as Promise<bigint>,
      client.readContract({
        address: CONTRACTS.NexusVault,
        abi: NexusVaultABI,
        functionName: 'totalDeposits',
      }) as Promise<bigint>,
      client.readContract({
        address: CONTRACTS.NexusVault,
        abi: NexusVaultABI,
        functionName: 'getRiskParams',
      }) as Promise<[bigint, bigint, boolean]>,
    ]);

    return c.json({
      userAddress,
      balanceUSDC: formatUnits(balance, 6),
      highWaterMarkUSDC: formatUnits(highWaterMark, 6),
      totalDepositsUSDC: formatUnits(totalDeposits, 6),
      riskParams: {
        maxDrawdownBps: Number(riskParams[0]),
        maxPositionSizeBps: Number(riskParams[1]),
        isPaused: riskParams[2],
      },
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch vault data', details: String(error) }, 500);
  }
});

// ── Signals Count Endpoint ──────────────────────────────────────────────────
app.get('/api/signals/count', async (c) => {
  try {
    const client = getPublicClient();
    const total = (await client.readContract({
      address: CONTRACTS.SignalRegistry,
      abi: SignalRegistryABI,
      functionName: 'totalSignalsLogged',
    })) as bigint;

    const actualCount = Number(total) > 0 ? Number(total) - 1 : 0;
    return c.json({ totalSignals: actualCount });
  } catch (error) {
    return c.json({ error: 'Failed to fetch signal count', details: String(error) }, 500);
  }
});

export default app;
