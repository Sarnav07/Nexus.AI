# NEXUS Architecture Audit Report

## System Diagram Description

### Module Dependencies

```
frontend/
├── UI Components (React + Vite)
├── State Management (Zustand + TanStack Query)
├── Wallet Integration (RainbowKit + Wagmi)
└── API Calls → orchestrator/

agents/orchestrator/
├── HTTP Server (Hono)
├── AI Agent (Gemini 2.5 Flash integration)
├── Tool System (vault, leaderboard, signals, market, trade, wallet)
├── Config (chain, contracts)
└── Dependencies:
    ├── specialist/ (market data, yield farming)
    ├── risk-guardian/ (trade validation)
    └── shared/ (ABIs)

agents/specialist/
├── Market Scout (token prices, overviews)
├── Yield Farmer (liquidity opportunities)
├── Signals Service (trade signal generation)
└── Dependencies: shared/ (ABIs)

agents/risk-guardian/
├── Validator (drawdown/position limits)
└── Dependencies: shared/ (ABIs)

agents/pay-relay/
├── Express Server (x402 micropayments)
├── On-chain Listener (payment verification)
└── Dependencies: shared/ (ABIs)

agents/shared/
└── ABIs (NexusVault, SignalRegistry, AgentLeaderboard)

contracts/
├── Solidity Contracts (NexusVault, SignalRegistry, AgentLeaderboard)
├── Foundry Tests
└── ABI Extraction Script

infra/
└── Docker Compose (placeholder)

docs/
└── Documentation (architecture, API, integration)
```

### Data Flow Summary

#### Critical Path 1: Agent Decision → On-Chain Signal Submission
1. User query → frontend TerminalView → POST /api/chat
2. Orchestrator receives → Gemini processes with tools
3. Gemini calls signAndExecuteTrade → teeWalletService.signAndBroadcast
4. Signal logged to SignalRegistry → Trade executed on Uniswap/Target
5. Tx hashes returned → Frontend displays

#### Critical Path 2: Vault Deposit → Copy-Trade Execution
1. User deposit USDC → frontend wagmi.writeContract(NexusVault.deposit)
2. On-chain deposit → NexusVault.balances/highWaterMark updated
3. Orchestrator tools read NexusVault for risk checks
4. Trade validation → Execution via Path 1

#### Critical Path 3: Leaderboard Score Update → Frontend Display
1. Periodic AgentLeaderboard.takeSnapshot() (assumed)
2. Orchestrator /api/leaderboard → AgentLeaderboard.getLeaderboard()
3. Frontend polls via TanStack Query → Leaderboard UI

#### Critical Path 4: x402 Micropayment Authorization → Signal Access Unlock
1. User pays → AgentLeaderboard.routeSubscriptionFee()
2. Pay-relay on-chain listener detects event → Generates JWT
3. Frontend /verify-payment/:txHash → Returns JWT
4. Bearer token → /api/agent-signals → Access granted

#### Critical Path 5: Gemini API Call → Response → Rendered Output
1. Frontend sendMessage → POST /api/audit-chat
2. Orchestrator streamText(Gemini) → Streaming response
3. Frontend ReadableStream → Accumulates text → Markdown render

### ABI Integration Map

#### NexusVault ABI Usage
- **orchestrator/tools/vault-tools.ts**:
  - checkBalance: balances(address)
  - checkRiskParams: getRiskParams()
  - checkDrawdownLimit: checkDrawdownLimit(user, amount)
  - checkPositionSize: checkPositionSize(amount)
  - getTotalDeposits: totalDeposits()
- **frontend**: wagmi reads balances/highWaterMark for dashboard

#### SignalRegistry ABI Usage
- **orchestrator/tools/signal-tools.ts**:
  - getTotalSignals: totalSignalsLogged()
  - getRecentSignals: getSignal(index) [assumed]
- **orchestrator/tools/tee-wallet-tools.ts**:
  - signAndExecuteTrade: logs signal via encoded call

#### AgentLeaderboard ABI Usage
- **orchestrator/tools/leaderboard-tools.ts**:
  - getLeaderboard: getLeaderboard()
  - getAgentPnL: getAgentPnL(address)
  - getAgentDetails: getAgentDetails(address)
- **pay-relay/onchain.ts**: Listens to SubscriptionFeeRouted events
- **pay-relay/middleware.ts**: Validates payments via contract calls (implied)

#### ERC20 ABI Usage
- **frontend**: wagmi for USDC.approve() before deposit