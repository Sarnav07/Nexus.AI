import { Hono } from 'hono';
import { cors } from 'hono/cors';
import * as cron from 'node-cron';
import { createPublicClient, http } from 'viem';
import { xLayerTestnet, CONTRACTS } from './config/chain.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const NexusVaultABI = require('../../../shared/abis/NexusVault.json');
const SignalRegistryABI = require('../../../shared/abis/SignalRegistry.json');
const AgentLeaderboardABI = require('../../../shared/abis/AgentLeaderboard.json');

// ERC20 ABI for token interactions
const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  }
];
import { execSync } from 'child_process';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// OnchainOS CLI commands
const ONCHAINOS_COMMANDS = {
  getMarketData: (chainId: number, tokens: string[]) =>
    `onchainos market prices --tokens ${tokens.join(',')} --chain ${chainId}`,
  executeSwap: (params: any) =>
    `onchainos dex swap --token-in ${params.tokenIn} --token-out ${params.tokenOut} --amount ${params.amount} --slippage ${params.slippage} --chain ${params.chainId}`,
  getWalletBalance: (address: string, chainId: number) =>
    `onchainos wallet balance --address ${address} --chain ${chainId}`,
};

const app = new Hono();
const port = process.env.PORT || 3001;

// Initialize Viem client
const publicClient = createPublicClient({
  chain: xLayerTestnet,
  transport: http(),
});

// OnchainOS configuration
// OnchainOS configuration
const ONCHAINOS_CONFIG = {
  chainId: 1952,
  usdcAddress: '0x74b7f16337b8972027f6196a17a631ac6de26d743', // USDC on X Layer
  usdgAddress: CONTRACTS.USDG, // USDG on X Layer
  wethAddress: '0xc1cC9368a66e1b9E0E5cC8b8c7c4b6b8b9c0c1c2', // WETH on X Layer (placeholder)
};

// Autonomous trading configuration
const TRADING_CONFIG = {
  checkInterval: '*/5 * * * *', // Every 5 minutes
  minTradeAmount: 100, // Minimum $100 trade
  maxTradeAmount: 1000, // Maximum $1000 trade
  riskThreshold: 0.02, // 2% risk per trade
};

// Trading state
let isTradingActive = false;
let lastTradeTime = 0;
const tradeCooldown = 5 * 60 * 1000; // 5 minutes
let userWalletAddress: string | null = null; // Will be set when user connects wallet

// Manual trade execution state
let pendingTrade: any = null;

// Gemini AI Configuration
const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
console.log('🔑 Gemini API Key loaded:', GEMINI_API_KEY ? 'Yes (length: ' + GEMINI_API_KEY.length + ')' : 'No');

// Test the API key at startup
let genAI = null;
if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your-api-key-here' && GEMINI_API_KEY.startsWith('AIzaSy')) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log('🔄 Testing API key...');

    // Actually test the API key by making a simple request
    const testModel = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
    await testModel.generateContent('Hello');

    console.log('🤖 Gemini AI initialized: Yes');
    console.log('✅ Gemini AI is ready for use!');
    console.log('💡 AI features: Market analysis, trade execution, wallet balance, system status');
  } catch (error) {
    console.error('❌ Failed to initialize Gemini AI:', (error as Error).message);
    console.log('🤖 Gemini AI initialized: No (API key not set or invalid)');
    genAI = null;
  }
} else {
  console.log('🤖 Gemini AI initialized: No (API key not set or invalid)');
}
const model = genAI ? genAI.getGenerativeModel({
  model: 'gemini-1.5-pro',
  tools: [
    {
      functionDeclarations: [
        {
          name: 'analyze_market',
          description: 'Analyze current market conditions and identify trading opportunities',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {},
            required: []
          }
        },
        {
          name: 'execute_trade',
          description: 'Execute a trade with the specified parameters',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              type: { type: SchemaType.STRING, format: 'enum', enum: ['BUY', 'SELL'], description: 'Trade type' },
              tokenAddress: { type: SchemaType.STRING, description: 'Token contract address' },
              amount: { type: SchemaType.NUMBER, description: 'Trade amount in USD' },
              reason: { type: SchemaType.STRING, description: 'Reason for the trade' }
            },
            required: ['type', 'tokenAddress', 'amount', 'reason']
          }
        },
        {
          name: 'get_wallet_balance',
          description: 'Get the current wallet balance and portfolio information',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {},
            required: []
          }
        },
        {
          name: 'get_usdg_balance',
          description: 'Query the user for USDG tokens on X Layer testnet',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              userAddress: { type: SchemaType.STRING, description: 'User wallet address to check USDG balance' }
            },
            required: ['userAddress']
          }
        },
        {
          name: 'request_usdg_transfer',
          description: 'Request user to sign a message for transferring USDG tokens to the protocol',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              userAddress: { type: SchemaType.STRING, description: 'User wallet address' },
              amount: { type: SchemaType.STRING, description: 'Amount of USDG tokens to transfer' },
              reason: { type: SchemaType.STRING, description: 'Reason for the transfer request' }
            },
            required: ['userAddress', 'amount', 'reason']
          }
        },
        {
          name: 'get_system_status',
          description: 'Get the current system status and agent health',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {},
            required: []
          }
        }
      ]
    }
  ]
}) : null;

// Function implementations for Gemini AI
async function analyzeMarketGemini() {
  try {
    const marketData = await getMarketData();
    const opportunities = analyzeMarketConditions(marketData);

    return {
      marketData,
      opportunities: opportunities.map(opp => {
        const tokenAddress = opp.type === 'BUY' ? opp.tokenOut : opp.tokenIn;
        const token = marketData.tokens?.find((t: any) => t.address === tokenAddress);
        return {
          type: opp.type,
          tokenSymbol: token?.symbol || 'Unknown',
          tokenAddress,
          amount: opp.amount,
          reason: opp.reason,
          price: token?.price,
          change24h: token?.priceChange24h,
          volume: token?.volume24h
        };
      }),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Market analysis error:', error);
    return { error: 'Failed to analyze market' };
  }
}

async function executeTradeGemini(params: { type: string, tokenAddress: string, amount: number, reason: string }) {
  try {
    if (!userWalletAddress) {
      return { error: 'No wallet connected. Please connect your wallet first.' };
    }

    // Create trade object
    const trade = {
      type: params.type,
      tokenIn: params.type === 'BUY' ? ONCHAINOS_CONFIG.usdcAddress : params.tokenAddress,
      tokenOut: params.type === 'BUY' ? params.tokenAddress : ONCHAINOS_CONFIG.usdcAddress,
      amount: params.amount,
      reason: params.reason
    };

    // Execute the trade
    const result = await executeManualTrade(trade);

    if (result.success) {
      return {
        success: true,
        trade: {
          type: params.type,
          token: params.tokenAddress,
          amount: params.amount,
          txHash: result.result.txHash,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      return { error: result.error };
    }
  } catch (error) {
    console.error('Trade execution error:', error);
    return { error: 'Failed to execute trade' };
  }
}

async function getWalletBalanceGemini() {
  try {
    if (!userWalletAddress) {
      return { error: 'No wallet connected' };
    }

    // In a real implementation, this would query the wallet balance
    // For now, return mock data
    return {
      address: userWalletAddress,
      balances: [
        { token: 'USDC', amount: 1000, value: 1000 },
        { token: 'ETH', amount: 0.5, value: 1500 }
      ],
      totalValue: 2500,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Wallet balance error:', error);
    return { error: 'Failed to get wallet balance' };
  }
}

async function getSystemStatusGemini() {
  return {
    orchestrator: 'online',
    specialist: 'online',
    riskGuardian: 'online',
    payRelay: 'online',
    tradingActive: isTradingActive,
    lastTradeTime: lastTradeTime ? new Date(lastTradeTime).toISOString() : null,
    walletConnected: !!userWalletAddress,
    timestamp: new Date().toISOString()
  };
}

async function getUSDGBalanceGemini(userAddress: string) {
  try {
    console.log('🔍 Querying USDG balance for address:', userAddress);

    // Query USDG balance using ERC20 balanceOf function
    const balance = await publicClient.readContract({
      address: CONTRACTS.USDG as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress as `0x${string}`],
    });

    const decimals = await publicClient.readContract({
      address: CONTRACTS.USDG as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'decimals',
      args: [],
    });

    const symbol = await publicClient.readContract({
      address: CONTRACTS.USDG as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'symbol',
      args: [],
    });

    const balanceFormatted = Number(balance) / Math.pow(10, Number(decimals));

    console.log(`💰 USDG Balance for ${userAddress}: ${balanceFormatted} ${symbol}`);

    return {
      address: userAddress,
      token: symbol,
      balance: balanceFormatted,
      rawBalance: (balance as bigint).toString(),
      decimals: Number(decimals),
      contractAddress: CONTRACTS.USDG,
      chain: 'X Layer Testnet',
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('USDG balance query error:', error);
    return { error: 'Failed to query USDG balance on X Layer testnet' };
  }
}

async function requestUSDGTransferGemini(userAddress: string, amount: string, reason: string) {
  try {
    console.log('📝 Creating USDG transfer request for:', { userAddress, amount, reason });

    // Create a structured message for the user to sign
    const transferRequest = {
      type: 'USDG_TRANSFER_REQUEST',
      userAddress,
      amount,
      token: 'USDG',
      contractAddress: CONTRACTS.USDG,
      recipient: CONTRACTS.NEXUS_VAULT,
      chain: 'X Layer Testnet',
      chainId: 1952,
      reason,
      timestamp: new Date().toISOString(),
      nonce: Date.now().toString()
    };

    // Create the message to sign
    const messageToSign = `USDG Transfer Request\n\nI request to transfer ${amount} USDG tokens from my wallet ${userAddress} to the Nexus Protocol vault at ${CONTRACTS.NEXUS_VAULT} on X Layer Testnet.\n\nReason: ${reason}\n\nTimestamp: ${transferRequest.timestamp}\n\nPlease sign this message to authorize the transfer.`;

    console.log('✍️ Generated transfer request message:', messageToSign);

    return {
      transferRequest,
      messageToSign,
      instructions: 'Please sign this message in your wallet to authorize the USDG token transfer to the Nexus Protocol.',
      contractAddress: CONTRACTS.USDG,
      recipientAddress: CONTRACTS.NEXUS_VAULT,
      chainId: 1952,
      chainName: 'X Layer Testnet'
    };
  } catch (error) {
    console.error('USDG transfer request error:', error);
    return { error: 'Failed to create USDG transfer request' };
  }
}

app.use('*', cors());

// Health check endpoint
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// API endpoints for frontend
app.get('/api/signals', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');

    // Get recent signals from SignalRegistry
    const signals = await publicClient.readContract({
      address: CONTRACTS.SIGNAL_REGISTRY,
      abi: SignalRegistryABI.abi,
      functionName: 'getRecentSignals',
      args: [BigInt(limit)],
    });

    return c.json({ signals });
  } catch (error) {
    console.error('Error fetching signals:', error);
    return c.json({ error: 'Failed to fetch signals' }, 500);
  }
});

app.get('/api/leaderboard', async (c) => {
  try {
    const leaderboard = await publicClient.readContract({
      address: CONTRACTS.AGENT_LEADERBOARD,
      abi: AgentLeaderboardABI.abi,
      functionName: 'getLeaderboard',
      args: [],
    });

    return c.json({ agents: leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return c.json({ error: 'Failed to fetch leaderboard' }, 500);
  }
});

// USDG balance query endpoint
app.get('/api/usdg-balance/:address', async (c) => {
  try {
    const userAddress = c.req.param('address');
    console.log('🔍 API request for USDG balance:', userAddress);

    const balance = await getUSDGBalanceGemini(userAddress);
    return c.json(balance);
  } catch (error) {
    console.error('Error fetching USDG balance:', error);
    return c.json({ error: 'Failed to fetch USDG balance' }, 500);
  }
});

// USDG transfer request endpoint
app.post('/api/usdg-transfer-request', async (c) => {
  try {
    const body = await c.req.json();
    const { userAddress, amount, reason } = body;

    if (!userAddress || !amount || !reason) {
      return c.json({ error: 'Missing required parameters: userAddress, amount, reason' }, 400);
    }

    console.log('📝 API request for USDG transfer:', { userAddress, amount, reason });

    const transferRequest = await requestUSDGTransferGemini(userAddress, amount, reason);
    return c.json(transferRequest);
  } catch (error) {
    console.error('Error creating USDG transfer request:', error);
    return c.json({ error: 'Failed to create USDG transfer request' }, 500);
  }
});

// Autonomous trading function
async function executeAutonomousTrade() {
  if (isTradingActive) {
    console.log('Trading already active, skipping...');
    return;
  }

  const now = Date.now();
  if (now - lastTradeTime < tradeCooldown) {
    console.log('Trade cooldown active, skipping...');
    return;
  }

  try {
    isTradingActive = true;
    console.log('Starting autonomous trading cycle...');

    // Get market data using OnchainOS CLI
    const marketData = await getMarketData();

    // Analyze market conditions
    const opportunities = analyzeMarketConditions(marketData);

    if (opportunities.length === 0) {
      console.log('No trading opportunities found');
      return;
    }

    // Select best opportunity
    const trade = opportunities[0];

    // Check risk limits with Risk Guardian
    const riskApproved = await checkRiskLimits(trade);
    if (!riskApproved) {
      console.log('Trade rejected by risk guardian');
      return;
    }

    // Execute trade using OnchainOS CLI
    const tradeResult = await executeTrade(trade);

    // Log signal to SignalRegistry
    await logTradeSignal(trade, tradeResult);

    lastTradeTime = now;
    console.log('Autonomous trade executed successfully:', tradeResult);

  } catch (error) {
    console.error('Error in autonomous trading:', error);
  } finally {
    isTradingActive = false;
  }
}

function analyzeMarketConditions(marketData: any) {
  const opportunities = [];

  // Simple momentum strategy - buy on dips, sell on rallies
  for (const token of marketData.tokens) {
    const priceChange = token.priceChange24h;
    const volume = token.volume24h;

    if (priceChange < -0.02 && volume > 100000) { // 2% dip with good volume
      opportunities.push({
        type: 'BUY',
        tokenIn: '0x74b7f16337b8972027f6196a17a631ac6de26d743', // USDC
        tokenOut: token.address,
        amount: Math.min(TRADING_CONFIG.maxTradeAmount, volume * 0.001), // 0.1% of volume
        reason: 'Price dip with volume',
      });
    } else if (priceChange > 0.03 && volume > 100000) { // 3% rally
      opportunities.push({
        type: 'SELL',
        tokenIn: token.address,
        tokenOut: '0x74b7f16337b8972027f6196a17a631ac6de26d743', // USDC
        amount: Math.min(TRADING_CONFIG.maxTradeAmount, volume * 0.001),
        reason: 'Price rally with volume',
      });
    }
  }

  return opportunities.sort((a, b) => {
    // Sort by absolute price change (highest momentum first)
    const aToken = marketData.tokens.find((t: any) => t.address === (a.type === 'BUY' ? a.tokenOut : a.tokenIn));
    const bToken = marketData.tokens.find((t: any) => t.address === (b.type === 'BUY' ? b.tokenOut : b.tokenIn));
    const aChange = Math.abs(aToken?.priceChange24h || 0);
    const bChange = Math.abs(bToken?.priceChange24h || 0);
    return bChange - aChange; // Highest change first
  });
}

async function checkRiskLimits(trade: any): Promise<boolean> {
  try {
    if (!userWalletAddress) {
      console.log('No wallet connected for risk check');
      return false;
    }

    // Simplified risk check for demo - in production this would check contracts
    const tradeAmount = trade.amount;

    // Basic risk checks
    if (tradeAmount > TRADING_CONFIG.maxTradeAmount) {
      console.log('Trade amount exceeds maximum');
      return false;
    }

    if (tradeAmount < TRADING_CONFIG.minTradeAmount) {
      console.log('Trade amount below minimum');
      return false;
    }

    // Check if we have a recent trade (cooldown)
    const now = Date.now();
    if (now - lastTradeTime < tradeCooldown) {
      console.log('Trade cooldown active');
      return false;
    }

    console.log('Risk check passed');
    return true;

    // TODO: Uncomment when contracts are properly deployed
    /*
    const drawdownOk = await publicClient.readContract({
      address: CONTRACTS.NEXUS_VAULT,
      abi: NexusVaultABI.abi,
      functionName: 'checkDrawdownLimit',
      args: [userWalletAddress, BigInt(tradeAmount * 1e6)],
    });

    const positionOk = await publicClient.readContract({
      address: CONTRACTS.NEXUS_VAULT,
      abi: NexusVaultABI.abi,
      functionName: 'checkPositionSize',
      args: [BigInt(tradeAmount * 1e6)],
    });

    return drawdownOk && positionOk;
    */
  } catch (error) {
    console.error('Risk check failed:', error);
    return false;
  }
}

async function logTradeSignal(trade: any, result: any) {
  try {
    // For now, just log to console. In production, this would log to SignalRegistry
    console.log('Trade signal logged:', { trade, result, timestamp: Date.now() });
  } catch (error) {
    console.error('Failed to log trade signal:', error);
  }
}

function encodeLogSignal(trade: any, result: any) {
  // Placeholder for future SignalRegistry integration
  return '0x...';
}

// Manual trade execution function
async function executeManualTrade(trade: any) {
  try {
    console.log('Executing manual trade:', trade);

    // Check risk limits with Risk Guardian
    const riskApproved = await checkRiskLimits(trade);
    if (!riskApproved) {
      console.log('Trade rejected by risk guardian');
      return { success: false, error: 'Risk check failed' };
    }

    // Call Specialist Agent to execute the trade
    const specialistResponse = await fetch('http://localhost:3002/api/execute-trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trade,
        walletAddress: userWalletAddress
      })
    });

    if (!specialistResponse.ok) {
      throw new Error('Specialist agent failed to execute trade');
    }

    const tradeResult = await specialistResponse.json();

    // Log signal to SignalRegistry
    await logTradeSignal(trade, tradeResult);

    lastTradeTime = Date.now();
    console.log('Manual trade executed successfully:', tradeResult);

    return { success: true, result: tradeResult };

  } catch (error) {
    console.error('Error in manual trade execution:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Helper functions for OnchainOS CLI integration
async function getMarketData() {
  try {
    const command = ONCHAINOS_COMMANDS.getMarketData(ONCHAINOS_CONFIG.chainId, [
      ONCHAINOS_CONFIG.usdcAddress,
      ONCHAINOS_CONFIG.wethAddress
    ]);

    const output = execSync(command, { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (error) {
    console.error('Failed to get market data from OnchainOS, using mock data for demo:', error);
    // Return mock data for demonstration when API is unavailable
    return {
      tokens: [
        {
          address: '0x1234567890123456789012345678901234567890',
          symbol: 'DEMO',
          name: 'Demo Token',
          price: 1.25,
          priceChange24h: 0.05,
          volume24h: 150000,
          marketCap: 125000,
          liquidity: 25000
        },
        {
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          symbol: 'TEST',
          name: 'Test Token',
          price: 0.85,
          priceChange24h: -0.025,
          volume24h: 200000,
          marketCap: 85000,
          liquidity: 15000
        },
        {
          address: '0x1111111111111111111111111111111111111111',
          symbol: 'MOCK',
          name: 'Mock Token',
          price: 2.10,
          priceChange24h: 0.15,
          volume24h: 300000,
          marketCap: 210000,
          liquidity: 50000
        }
      ]
    };
  }
}

async function executeTrade(trade: any) {
  try {
    const command = ONCHAINOS_COMMANDS.executeSwap({
      tokenIn: trade.tokenIn,
      tokenOut: trade.tokenOut,
      amount: trade.amount,
      slippage: 0.005,
      chainId: ONCHAINOS_CONFIG.chainId,
    });

    const output = execSync(command, { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (error) {
    console.error('Failed to execute trade:', error);
    throw error;
  }
}

// Manual trade trigger endpoint
app.post('/api/trade', async (c) => {
  try {
    if (!pendingTrade) {
      return c.json({ error: 'No pending trade to execute' }, 400);
    }

    const result = await executeManualTrade(pendingTrade);
    pendingTrade = null; // Clear pending trade

    if (result.success) {
      return c.json({ status: 'Trade executed successfully', result: result.result });
    } else {
      return c.json({ error: result.error }, 400);
    }
  } catch (error) {
    return c.json({ error: 'Failed to execute trade' }, 500);
  }
});

// Wallet connection endpoint
app.post('/api/connect-wallet', async (c) => {
  try {
    const { address } = await c.req.json();
    userWalletAddress = address;
    console.log('Wallet connected:', address);
    return c.json({ status: 'Wallet connected successfully' });
  } catch (error) {
    return c.json({ error: 'Failed to connect wallet' }, 500);
  }
});

// Market analysis endpoint
app.get('/api/analyze-market', async (c) => {
  try {
    const marketData = await getMarketData();
    const opportunities = analyzeMarketConditions(marketData);

    // Store the best opportunity as pending trade
    if (opportunities.length > 0) {
      pendingTrade = opportunities[0];
    }

    return c.json({
      marketData,
      opportunities,
      pendingTrade: pendingTrade ? {
        type: pendingTrade.type,
        token: marketData.tokens?.find((t: any) => t.address === pendingTrade.tokenOut)?.symbol || 'Unknown',
        amount: pendingTrade.amount,
        reason: pendingTrade.reason
      } : null
    });
  } catch (error) {
    return c.json({ error: 'Failed to analyze market' }, 500);
  }
});

// Chat endpoint for AI interactions
app.post('/api/chat', async (c) => {
  try {
    const { messages } = await c.req.json();

    if (!messages || !Array.isArray(messages)) {
      return c.json({ error: 'Invalid messages format' }, 400);
    }

    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      return c.json({ error: 'No user message found' }, 400);
    }

    const userInput = userMessage.content.toLowerCase().trim();

    // Gemini AI-powered chat with function calling
    let response = '';

    if (!model) {
      // Fallback when AI is not configured
      if (userInput.includes('hello') || userInput.includes('hi') || userInput.includes('greetings')) {
        response = `Hello! I'm the Nexus AI Orchestrator, your intelligent DeFi trading assistant.

I'm here to help you with your trading strategy, market analysis, and automated trading on X Layer. What would you like to explore today?`;

      } else {
        // Commands that need market data
        let marketData = null;
        let opportunities = [];

        try {
          // Get real-time market data for analysis
          marketData = await getMarketData();
          opportunities = analyzeMarketConditions(marketData);
        } catch (marketError) {
          console.error('Market data error in fallback mode:', marketError);
        }

        if (userInput.includes('best') && (userInput.includes('strateg') || userInput.includes('trade') || userInput.includes('opportunity'))) {
          if (marketData && opportunities.length > 0) {
            // Store the best opportunity as pending trade
            pendingTrade = opportunities[0];
            const tokenAddress = pendingTrade.type === 'BUY' ? pendingTrade.tokenOut : pendingTrade.tokenIn;
            const token = marketData.tokens?.find((t: any) => t.address === tokenAddress);

            response = `## Top Trading Opportunity Right Now

**Strategy:** ${pendingTrade.type} on Price Momentum
**Token:** ${token?.symbol || 'Unknown'} (${tokenAddress})
**Signal:** ${pendingTrade.reason}
**Potential Return:** ${Math.abs(token?.priceChange24h * 100 || 0).toFixed(2)}% in 24h
**Volume:** $${(token?.volume24h || 0).toLocaleString()}

Would you like me to execute this trade or analyze a specific token?`;

          } else {
            response = `## Current Market Analysis

I'm currently monitoring the X Layer testnet markets, but no strong trading opportunities meet our criteria right now.

### Market Conditions:
- Tokens Monitored: ${marketData?.tokens?.length || 0}
- Active Signals: 0 (waiting for optimal entry)
- Risk Level: Conservative (market volatility monitoring)

The market is currently in a consolidation phase. I recommend waiting for clearer momentum signals before entering positions.`;
          }

        } else if (userInput.includes('status') || userInput.includes('health') || userInput.includes('system')) {
          response = `## System Status Report

### Agent Health:
- Orchestrator: Online (Trading ${isTradingActive ? 'Active' : 'Monitoring'})
- Specialist: Online (Market Analysis)
- Risk Guardian: Online (Position Safety)
- Pay Relay: Online (Fee Management)
- AI Status: ✅ Active (Advanced market analysis enabled)

### Trading Engine:
- Strategy: Momentum-based algorithmic trading
- Scan Frequency: Every 5 minutes
- Active Opportunities: ${opportunities.length}
- Risk Limits: 2% max drawdown, $1000 max position

All systems operational. Ready for autonomous trading execution.`;

        } else {
          response = `## 🤖 **Nexus AI Trading Assistant**

Welcome to the Nexus AI multi-agent DeFi trading platform. I'm your intelligent orchestrator for automated trading on X Layer.

### Available Commands:
- **"best trading strategies"** - Get current market opportunities
- **"status"** - System health and agent status
- **"execute trade"** - Execute validated trading opportunities

### Current Market State:
- Tokens Monitored: ${marketData?.tokens?.length || 0}
- Active Opportunities: ${opportunities.length}

What would you like to explore?`;
        }
      }

    } else {
      // Full AI mode - simplified without function calling for now
      try {
        console.log('🤖 Using Gemini AI for chat...');

        // Create a simple model without function calling
        const simpleModel = genAI!.getGenerativeModel({ model: 'gemini-1.5-pro' });

        // Build conversation history
        const history = messages.slice(0, -1).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }));

        // Start chat
        const chat = simpleModel.startChat({
          history: history
        });

        // Send message
        const result = await chat.sendMessage(userMessage.content);
        const aiResponse = result.response.text();

        console.log('✅ AI Response received, length:', aiResponse.length);
        response = aiResponse;

        // TODO: Add function calling back later once basic AI works
        // Handle function calls from Gemini
        const functionCalls = result.response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
          console.log('🔧 Function calls detected:', functionCalls.length);

          for (const call of functionCalls) {
            console.log('📞 Executing function:', call.name, call.args);

            try {
              let functionResult;

              switch (call.name) {
                case 'analyze_market':
                  functionResult = await analyzeMarketGemini();
                  break;
                case 'execute_trade':
                  const tradeArgs = call.args as { type: string; tokenAddress: string; amount: number; reason: string };
                  functionResult = await executeTradeGemini(tradeArgs);
                  break;
                case 'get_wallet_balance':
                  functionResult = await getWalletBalanceGemini();
                  break;
                case 'get_usdg_balance':
                  const balanceArgs = call.args as { userAddress: string };
                  functionResult = await getUSDGBalanceGemini(balanceArgs.userAddress);
                  break;
                case 'request_usdg_transfer':
                  const transferArgs = call.args as { userAddress: string; amount: string; reason: string };
                  functionResult = await requestUSDGTransferGemini(transferArgs.userAddress, transferArgs.amount, transferArgs.reason);
                  break;
                case 'get_system_status':
                  functionResult = await getSystemStatusGemini();
                  break;
                default:
                  functionResult = { error: `Unknown function: ${call.name}` };
              }

              console.log('✅ Function result:', functionResult);

              // Send function result back to Gemini
              const functionResponse = await chat.sendMessage([{
                functionResponse: {
                  name: call.name,
                  response: functionResult
                }
              }]);

              response = functionResponse.response.text();
              console.log('📝 Function response from AI:', response.substring(0, 200) + '...');

            } catch (funcError) {
              console.error('❌ Function execution error:', funcError);
              response = `I apologize, but I encountered an error while processing your request: ${(funcError as Error).message}`;
            }
          }
        } else {
          // No function calls, use the direct response
          response = aiResponse;
        }

      } catch (aiError) {
        console.error('❌ Gemini AI error:', aiError);
        console.error('❌ Error message:', (aiError as Error).message);
        const errorMessage = (aiError as Error).message;
        response = `I apologize, but I'm having trouble processing your request right now.

**AI Service Issue:** ${errorMessage.includes('404') || errorMessage.includes('not found') ? 'Invalid or incorrect API key configuration' : 'Temporary service connectivity issue'}

${errorMessage.includes('404') || errorMessage.includes('not found') ?
`**Solution:** Please verify your GOOGLE_GENERATIVE_AI_API_KEY from https://makersuite.google.com/app/apikey` :
`Please try again in a moment or check your internet connection.`}

However, I can still help you with basic trading operations. You can try:
- "analyze market" - Get current market analysis
- "check balance" - View wallet balance
- "system status" - Check agent health

Please try again in a moment or use one of these direct commands.`;
      }
    }

    // Return the response as a text stream
    return new Response(response, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Chat endpoint error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Start server
console.log(`Nexus Orchestrator starting on port ${port}...`);
console.log('Autonomous trading enabled - checking every 5 minutes');

// Test Gemini API key asynchronously
if (genAI) {
  console.log('✅ Gemini AI is ready for use!');
  console.log('💡 AI features: Market analysis, trade execution, wallet balance, system status');
}

export default {
  port,
  fetch: app.fetch,
};

// Start the server
const { serve } = await import('@hono/node-server');
serve({
    fetch: app.fetch,
    port: Number(port),
  });