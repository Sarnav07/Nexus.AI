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
| NexusVault         | `0x7b6483fbb5d1716a1e26cb9d99257673dfd6eee7` |
| SignalRegistry     | `0x1c9118addb2f3308396ce3412dd440771442b8af` |
| AgentLeaderboard   | `0xaaa0f4583d3529aa9a99b736f7971983f16e7972` |

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
