# Nexus.AI

> Multi-agent DeFi intelligence platform on X Layer Testnet

## Overview

Nexus.AI is a trustless multi-agent DeFi platform where AI agents collaboratively manage liquidity positions, execute trades, and track performance — all with on-chain accountability.

## X Layer Ecosystem Positioning

As DeFi becomes increasingly complex, users are overwhelmed by managing yield across dozens of protocols. **Nexus.AI serves as an intelligent, intent-based layer specifically designed for the X Layer ecosystem.** By utilizing the high performance and low fees of the X Layer Testnet, we abstract away gas complexities and risk management. 

Instead of manually checking UniV3 ticks, a user on X Layer simply states: *"Get me the safest yield on USDC."* Our agents calculate the optimal route, ensure it meets the user's risk tolerance, and execute the transaction completely autonomously using securely managed Agentic Wallets on X Layer.

## Multi-Agent Architecture & Roles

Nexus.AI decouples the AI reasoning into three specialized agents for enhanced security and separation of concerns:

1. **Orchestrator Agent**: The "Brain". Parses the user's natural language intent, uses market data tools to formulate a strategy, and delegates execution instructions to the Specialist.
2. **Specialist Agents (Yield Farmer / Market Scout)**: The "Hands". Receives structured instructions from the Orchestrator, calculates exact Uniswap V3 ticks/slippage parameters, and builds the raw transaction `calldata`.
3. **Risk Guardian**: The "Shield". An independent microservice that intercepts the raw transaction before signing, checking it against the user's on-chain `NexusVault` limits (e.g., maximum allowable drawdown and position sizing). If it fails context validation, the transaction is rejected.

## Module Usage: Onchain OS & Uniswap Skills

To achieve true agentic execution on X Layer, our platform integrates standard core modules:

- **Onchain OS Wallet API**: Used by the Orchestrator to programmatically sign and broadcast transactions to X Layer without exposing private keys (see `agents/orchestrator/src/services/onchainos-wallet.ts` and the injected `okx/onchainos-skills` module).
- **Uniswap AI Skills**: Utilized by the Yield Farmer specialist to precisely route liquidity additions, calculate optimal ticks, and parse pool data (see `agents/orchestrator/src/skills/uniswap/agent-skills`).

## Working Mechanics

How an intent becomes a signed X Layer transaction:

1. **Intent Reception**: User sends "Put 100 USDC into a safe yield pool."
2. **Strategy Formulation**: Orchestrator queries market tools and decides to provide liquidity to a specific Uniswap V3 pair.
3. **Calldata Generation**: Specialist Agent calculates exact parameters and generates the execution bundle (idempotency key, target, calldata, value).
4. **Risk Verification**: Risk Guardian intercepts the bundle and queries `NexusVault` on X Layer to verify the trade respects the user's risk profile.
5. **Intent Logging**: The Onchain OS TEE Wallet signs a `LogSignal` transaction, submitting the intent to the `SignalRegistry` smart contract for transparency.
6. **Execution**: The Onchain OS TEE Wallet immediately signs and broadcasts the actual Uniswap V3 trade payload to X Layer Testnet.

## Repository Structure

```
├── contracts/                  Smart contracts (Foundry)
│   ├── src/
│   │   ├── NexusVault.sol          USDC custody + risk limits
│   │   ├── SignalRegistry.sol      Gas-optimised trade signal log
│   │   └── AgentLeaderboard.sol    PnL tracking + fee routing
│   ├── test/                   Foundry tests (61 total)
│   ├── script/Deploy.s.sol     Deployment script
│   ├── extract_abis.js         ABI extraction for teammates
│   └── foundry.toml
│
├── agents/                     Agent modules
│   ├── orchestrator/
│   ├── specialist/
│   ├── risk-guardian/
│   ├── pay-relay/
│   └── shared/abis/            Extracted ABIs
│
├── frontend/                   Next.js frontend
│   └── lib/abis/               Extracted ABIs
│
├── infra/                      Infrastructure
│
└── docs/                       Documentation
    ├── architecture.md
    ├── contracts-api.md
    └── integration-guide.md
```

## Quick Start — Contracts

```bash
# Install dependencies
cd contracts
forge install

# Build
forge build

# Run tests
forge test -vvv

# Deploy to X Layer Testnet
source .env
forge script script/Deploy.s.sol:Deploy --rpc-url xlayer_testnet --broadcast --chain-id 1952

# Extract ABIs for agents / frontend
node extract_abis.js
```

## Quick Start — Agents

Because the agents are decoupled for security (Orchestrator, Specialist, Risk Guardian), you must install dependencies in their respective folders before running the centralized Orchestrator API.

```bash
# 1. Install Specialist Dependencies
cd agents/specialist
npm install

# 2. Install Risk Guardian Dependencies
cd ../risk-guardian
npm install

# 3. Start the Orchestrator API Server
cd ../orchestrator
npm install
cp .env.example .env
npm run dev

# (Optional) Run the farming script
npm run farm
```

## Network

| Parameter | Value |
|-----------|-------|
| Chain | X Layer Testnet |
| Chain ID | 1952 |
| RPC | `https://testrpc.xlayer.tech` |
| Gas Token | OKB |

## Deployed Contracts

| Contract           | Address                                      |
|--------------------|----------------------------------------------|
| NexusVault         | `0x9DDa87f22F2a29D43b36417EA8eAEB1F68CFb689` |
| SignalRegistry     | `0x66B39854C90d9898dBEE1Aa1E24F541A731DC925` |
| AgentLeaderboard   | `0xE606422f053Cbb2F1961CE761fEe8c2a06f4db60` |

## Quick Start

1. **Install Dependencies**:
```bash
# Install root dependencies
npm install

# Install agent dependencies
cd agents/orchestrator && npm install
cd ../specialist && npm install
cd ../risk-guardian && npm install
cd ../pay-relay && npm install
```

2. **Configure Environment**:
```bash
# Copy and edit environment files
cp agents/orchestrator/.env.example agents/orchestrator/.env
cp agents/specialist/.env.example agents/specialist/.env
# Edit .env files with your actual API keys
```

3. **Build Contracts** (if not already built):
```bash
cd contracts
forge build
node extract_abis.js
```

4. **Start Agents**:
```bash
# Terminal 1: Orchestrator (with autonomous trading)
cd agents/orchestrator && npm run dev

# Terminal 2: Specialist (yield farming)
cd agents/specialist && npm run dev

# Terminal 3: Risk Guardian
cd agents/risk-guardian && npm run dev

# Terminal 4: Pay Relay
cd agents/pay-relay && npm run dev
```

5. **Start Frontend**:
```bash
cd frontend && npm run dev
```

## OnchainOS & Uniswap Integration

This project integrates OKX OnchainOS skills for DeFi operations:

- **okx-dex-swap**: Token swapping via Uniswap V3 on X Layer
- **okx-dex-market**: Real-time price feeds and market data
- **okx-agentic-wallet**: Secure wallet operations for trading
- **okx-onchain-gateway**: Transaction broadcasting and monitoring

Uniswap V3 skills enable:
- Concentrated liquidity provision
- Automated market making
- Gas-optimized swaps with slippage protection

## Working Mechanics

1. **User deposits USDC** into NexusVault smart contract
2. **Orchestrator AI** analyzes market conditions using OnchainOS skills
3. **Risk Guardian** validates trades against position limits
4. **Yield Farmer** executes Uniswap V3 operations (swaps/LP)
5. **Signal Registry** logs all trading actions on-chain
6. **Pay Relay** enables x402 micropayments for premium signals
7. **Agent Leaderboard** tracks PnL and distributes fees

## X Layer Ecosystem Positioning

Nexus.AI demonstrates:
- Multi-agent DeFi intelligence on X Layer L2
- Trustless AI-driven trading with on-chain accountability
- x402 payment flows for sustainable agent economies
- Integration with Uniswap V3 for decentralized liquidity

## ✅ Hackathon Submission Checklist

- [x] **Multi-Agent Architecture**: Orchestrator, Specialist, Risk Guardian, Pay Relay
- [x] **Autonomous Trading**: Scheduled market analysis and trade execution every 5 minutes
- [x] **OnchainOS Integration**: 14 skills installed for DeFi operations (DEX swap, market data, wallet)
- [x] **Smart Contracts**: NexusVault, SignalRegistry, AgentLeaderboard deployed on X Layer Testnet
- [x] **X Layer Testnet**: Chain ID 1952, Uniswap V3 router configured correctly
- [x] **Frontend Dashboard**: React app with Wagmi/RainbowKit integration
- [x] **Security**: .env files secured, no committed credentials, .gitignore protection
- [x] **Documentation**: README with setup instructions and architecture overview
- [x] **Testing**: Basic test suite for configuration validation
- [x] **Autonomous Operation**: Cron-based trading loop with risk management

## 🎯 Key Features Implemented

### Autonomous Trading Loop
- **Market Analysis**: Fetches price data every 5 minutes using OnchainOS skills
- **Risk Management**: Checks position limits and drawdown before trades
- **Trade Execution**: Uses OnchainOS skills for secure DEX operations
- **Signal Logging**: Records all trades to SignalRegistry for transparency

### Multi-Agent Coordination
- **Orchestrator**: Central coordinator with autonomous trading (Person 2)
- **Specialist**: Yield farming strategies with market scout + farmer agents (Person 3)
- **Risk Guardian**: Position limits and risk validation (Person 4)
- **Pay Relay**: x402 micropayments for premium signals (Person 4)

### DeFi Integration
- **Uniswap V3**: Concentrated liquidity and automated trading on X Layer
- **OnchainOS Skills**: 14 skills for secure wallet operations and DEX interactions
- **x402 Payments**: Micropayment system for agent subscriptions and fees

## Team

| Person | Role | Owns |
|--------|------|------|
| 1 | Smart Contract Lead | `contracts/` |
| 2 | Orchestrator Agent | `agents/orchestrator/` |
| 3 | Specialist Agents | `agents/specialist/` |
| 4 | Risk Guardian / Pay Relay | `agents/risk-guardian/`, `agents/pay-relay/` |
| 5 | Frontend | `frontend/` |

## License

MIT

{agent works}