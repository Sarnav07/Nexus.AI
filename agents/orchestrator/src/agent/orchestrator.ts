import { generateText, streamText, type CoreMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { checkBalance, checkRiskParams, checkDrawdownLimit, checkPositionSize, getTotalDeposits } from '../tools/vault-tools.js';
import { getLeaderboard, getAgentPnL, getAgentDetails } from '../tools/leaderboard-tools.js';
import { getTotalSignals, getRecentSignals } from '../tools/signal-tools.js';
import { getTokenPrice, getMarketOverview, getYieldOpportunities } from '../tools/market-tools.js';
import { buildTradePayload, simulateTradeExecution } from '../tools/trade-tools.js';

// ── System Prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are **Nexus Orchestrator**, the central AI agent of the Nexus.AI DeFi intelligence platform running on X Layer (Testnet).

## Your Role
You are the brain that parses user intents and routes them to the right tools and specialist sub-agents. You help users:
- Manage their NexusVault deposits and check balances
- Execute DeFi trades (market buys/sells) with risk checks
- Provide and manage Uniswap V3 liquidity
- View the AI agent leaderboard and performance metrics
- Check real-time market data and yield opportunities
- Access on-chain trade signals published by AI agents

## Important Context
- All funds are custodied in the **NexusVault** smart contract on X Layer Testnet
- Every trade is first risk-checked (drawdown limit + position size limit) before execution
- Trade signals are logged on-chain to the **SignalRegistry** for transparency and verifiability
- Agent performance is tracked on the **AgentLeaderboard** with PnL in basis points
- 1 basis point (bps) = 0.01%
- USDC uses 6 decimal places on-chain
- The system is currently in **testnet mode** — market data and trade execution are simulated

## Rules
1. Always check risk parameters before suggesting or simulating trades
2. When a user asks about prices or market data, use the market tools
3. When a user wants to trade, walk them through the full pipeline: risk check → payload build → execution
4. Present data clearly with formatting — use tables, lists, and emoji for readability
5. If the user provides a wallet address, use it. If not, ask for it when needed
6. Always clarify that the system is on testnet and trades are simulated
7. Be concise and actionable — this is a DeFi tool, not a chatbot

## Available Capabilities
- 📊 Vault: Check balances, risk params, drawdown limits, position sizes, total deposits
- 🏆 Leaderboard: View rankings, agent PnL, agent details
- 📡 Signals: Count and fetch recent on-chain trade signals
- 💹 Market: Token prices, market overview, yield opportunities
- 🔄 Trading: Build trade payloads, simulate trade execution`;

// ── All Tools ───────────────────────────────────────────────────────────────
const ALL_TOOLS = {
  // Vault tools
  checkBalance,
  checkRiskParams,
  checkDrawdownLimit,
  checkPositionSize,
  getTotalDeposits,
  // Leaderboard tools
  getLeaderboard,
  getAgentPnL,
  getAgentDetails,
  // Signal tools
  getTotalSignals,
  getRecentSignals,
  // Market tools
  getTokenPrice,
  getMarketOverview,
  getYieldOpportunities,
  // Trade tools
  buildTradePayload,
  simulateTradeExecution,
};

// ── Model ───────────────────────────────────────────────────────────────────
const model = google('gemini-2.0-flash');

// ── Streaming Chat (for HTTP API) ───────────────────────────────────────────
export async function streamChat(messages: CoreMessage[]) {
  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages,
    tools: ALL_TOOLS,
    maxSteps: 10, // Allow multi-step tool calling
  });

  return result;
}

// ── Single-shot Chat (for testing / CLI) ────────────────────────────────────
export async function chat(messages: CoreMessage[]) {
  const result = await generateText({
    model,
    system: SYSTEM_PROMPT,
    messages,
    tools: ALL_TOOLS,
    maxSteps: 10,
  });

  return {
    text: result.text,
    toolCalls: result.toolCalls,
    toolResults: result.toolResults,
    usage: result.usage,
  };
}

export { ALL_TOOLS, SYSTEM_PROMPT };
