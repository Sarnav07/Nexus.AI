import { generateText, streamText, type CoreMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { checkBalance, checkRiskParams, checkDrawdownLimit, checkPositionSize, getTotalDeposits } from '../tools/vault-tools.js';
import { getLeaderboard, getAgentPnL, getAgentDetails } from '../tools/leaderboard-tools.js';
import { getTotalSignals, getRecentSignals } from '../tools/signal-tools.js';
import { getTokenPrice, getMarketOverview, getYieldOpportunities } from '../tools/market-tools.js';
import { buildTradePayload, simulateTradeExecution } from '../tools/trade-tools.js';
import { signAndExecuteTrade } from '../tools/tee-wallet-tools.js';
import console from 'node:console';

// ── System Prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Nexus Orchestrator, an AI for DeFi on X Layer Testnet. Answer user questions helpfully.`;

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
  // Wallet tools
  signAndExecuteTrade,
};

// ── Model ───────────────────────────────────────────────────────────────────
const model = google('gemini-2.5-flash');

// ── Mock response for quota exceeded situations ─────────────────────────────
const MOCK_RESPONSES = [
  "Hello! I'm the NEXUS AI assistant. The Gemini API quota has been exceeded, but I'm here to help with DeFi questions once the quota resets.",
  "Welcome to NEXUS! The AI service is currently at quota limit. I can still provide information about vault status, signals, and DeFi strategies.",
  "Hi there! The AI API quota is full right now. Try asking about the current vault risk parameters or signal activity - I have that data cached locally.",
];

// ── Streaming Chat (for HTTP API) ───────────────────────────────────────────
export async function streamChat(messages: CoreMessage[]) {
  console.log('Starting streamChat with messages:', messages.length);

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages,
    tools: ALL_TOOLS,  // Enabled for production
    maxSteps: 10, // Allow multi-step tool calling
  });

  console.log('streamText result obtained');

  return result;
}

// ── Single-shot Chat (for testing / CLI) ────────────────────────────────────
export async function chat(messages: CoreMessage[]) {
  const result = await generateText({
    model,
    system: SYSTEM_PROMPT,
    messages,
    tools: ALL_TOOLS,  // Enabled
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
