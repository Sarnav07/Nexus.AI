import 'dotenv/config';
import { serve } from '@hono/node-server';
import app from './server.js';

const port = parseInt(process.env.PORT || '3001', 10);

console.log(`
╔══════════════════════════════════════════════════╗
║         🧠 Nexus Orchestrator Agent              ║
║         Agentic DeFi Intelligence Layer          ║
╠══════════════════════════════════════════════════╣
║  Server:     http://localhost:${port}               ║
║  Health:     http://localhost:${port}/api/health     ║
║  Chat:       POST /api/chat                      ║
║  Chat (sync):POST /api/chat/complete             ║
║  Leaderboard:GET  /api/leaderboard               ║
║  Vault:      GET  /api/vault/:address            ║
║  Signals:    GET  /api/signals/count             ║
╠══════════════════════════════════════════════════╣
║  Network:    X Layer Testnet (Chain ID: 1952)     ║
║  Model:      Gemini 2.0 Flash                   ║
║  Mode:       ${process.env.GOOGLE_GENERATIVE_AI_API_KEY ? '🟢 Live (API key loaded)' : '🔴 No API key — set GOOGLE_GENERATIVE_AI_API_KEY'}     ║
╚══════════════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
});
