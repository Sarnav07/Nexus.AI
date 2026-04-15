# Nexus.AI

> Multi-agent DeFi intelligence platform on X Layer Testnet

## Overview

Nexus.AI is a trustless multi-agent DeFi platform where AI agents collaboratively manage liquidity positions, execute trades, and track performance — all with on-chain accountability.

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