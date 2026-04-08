# Nexus Smart Contracts — API Reference

> **Chain:** X Layer Testnet (Chain ID: 1952, OKB gas)
> **Compiler:** Solidity 0.8.24 · Foundry · Optimizer 200 runs

---

## Deployed Contract Addresses

| Contract           | Address                                      |
|--------------------|----------------------------------------------|
| NexusVault         | `0x7b6483fbb5d1716a1e26cb9d99257673dfd6eee7` |
| SignalRegistry     | `0x1c9118addb2f3308396ce3412dd440771442b8af` |
| AgentLeaderboard   | `0xaaa0f4583d3529aa9a99b736f7971983f16e7972` |
| USDC (Testnet)     | `0x74b7f16337b8972027f6196a17a631ac6de26d22` |
| Treasury           | `0xbd598563ad2f462baa3f8da0e79c310ce03682c6` |

> ✅ Deployed on X Layer Testnet (Block 27214830)

---

## ABIs

After `forge build`, run:
```bash
node contracts/extract_abis.js
```

ABIs are written to:
- `frontend/lib/abis/` — Frontend
- `agents/shared/abis/` — All agent modules

---

## Contract 1: NexusVault

**Purpose:** Custodies user USDC deposits. Enforces per-vault risk limits (max drawdown, max position size). Single source of truth for position limits and drawdown rules.

### For Person 2 — Orchestrator Agent

| Function | Signature | Returns |
|----------|-----------|---------|
| Check drawdown | `checkDrawdownLimit(address user, uint256 proposedTradeUSDC)` | `bool ok` |
| Check position size | `checkPositionSize(uint256 proposedTradeUSDC)` | `bool ok` |
| Get risk params | `getRiskParams()` | `(uint256 drawdownBps, uint256 positionBps, bool isPaused)` |
| Read balance | `balances(address user)` | `uint256` |
| Read total deposits | `totalDeposits()` | `uint256` |

### For Person 3 — Specialist Agents

| Function | Signature | Returns |
|----------|-----------|---------|
| Check drawdown | `checkDrawdownLimit(address user, uint256 proposedTradeUSDC)` | `bool ok` |
| Check position size | `checkPositionSize(uint256 proposedTradeUSDC)` | `bool ok` |
| Read high-water mark | `highWaterMark(address user)` | `uint256` |

### For Person 4 — Risk Guardian / Pay Relay

| Function | Signature | Returns |
|----------|-----------|---------|
| **Risk params** | `getRiskParams()` | `(uint256 drawdownBps, uint256 positionBps, bool isPaused)` |
| Check drawdown | `checkDrawdownLimit(address user, uint256 proposedTradeUSDC)` | `bool ok` |
| Check position size | `checkPositionSize(uint256 proposedTradeUSDC)` | `bool ok` |
| Is agent authorized | `authorizedAgents(address)` | `bool` |
| Vault paused? | `paused()` | `bool` |

### For Person 5 — Frontend

#### Read Functions
```solidity
balances(address user) → uint256
totalDeposits() → uint256
highWaterMark(address user) → uint256
maxDrawdownBps() → uint256
maxPositionSizeBps() → uint256
paused() → bool
authorizedAgents(address) → bool
getRiskParams() → (uint256, uint256, bool)
checkDrawdownLimit(address, uint256) → bool
checkPositionSize(uint256) → bool
```

#### Write Functions (user-facing)
```solidity
deposit(uint256 amount)     // Requires USDC approval first
withdraw(uint256 amount)
```

#### Events
```solidity
event Deposited(address indexed user, uint256 amount);
event Withdrawn(address indexed user, uint256 amount);
event RiskLimitsUpdated(uint256 maxDrawdownBps, uint256 maxPositionBps);
event AgentAuthorized(address indexed agent, bool status);
```

---

## Contract 2: SignalRegistry

**Purpose:** Gas-optimised on-chain event log. Agents publish intended trading actions before executing them. ~28k gas per signal.

### For Person 2 — Orchestrator Agent

| Function | Signature | Notes |
|----------|-----------|-------|
| Log signal | `logSignal(bytes32 signalType, address tokenIn, address tokenOut, uint256 amountIn, int24 tickLower, int24 tickUpper)` | Must be authorized |
| Batch log | `logSignalBatch(SignalParams[] calldata signals)` | Array of signal tuples |

### For Person 3 — Specialist Agents

Same as Person 2. Each specialist agent needs to be authorized via `setAgentAuthorization`.

### Signal Type Constants (bytes32)

| Constant | Value | Description |
|----------|-------|-------------|
| `SIG_MARKET_BUY` | `keccak256("MARKET_BUY")` | Market buy order |
| `SIG_MARKET_SELL` | `keccak256("MARKET_SELL")` | Market sell order |
| `SIG_UNISWAP_ADD_LIQ` | `keccak256("UNISWAP_V3_ADD_LIQUIDITY")` | Add LP position |
| `SIG_UNISWAP_REMOVE_LIQ` | `keccak256("UNISWAP_V3_REMOVE_LIQUIDITY")` | Remove LP position |

### SignalParams Struct
```solidity
struct SignalParams {
    bytes32 signalType;
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    int24 tickLower;
    int24 tickUpper;
}
```

### For Person 5 — Frontend (Event Subscription)

```solidity
event SignalLogged(
    address indexed agentAddress,
    bytes32 indexed signalType,
    address indexed tokenIn,
    address tokenOut,
    uint256 amountIn,
    int24 tickLower,
    int24 tickUpper,
    uint256 timestamp
);
```

Read: `totalSignalsLogged()` — Note: actual count is `totalSignalsLogged - 1` (gas optimization).

---

## Contract 3: AgentLeaderboard

**Purpose:** Accounting + reputation layer. Tracks registered AI agents, calculates PnL in basis points, routes x402 subscription fees.

### For Person 2 — Orchestrator Agent

| Function | Signature | Returns |
|----------|-----------|---------|
| Take snapshot | `takeSnapshot(address agentAddress, uint256 currentBalanceUSDC)` | — |
| Get PnL | `getAgentPnL(address agentAddress)` | `(int256 pnlBps, uint256 startBalance, uint256 latestBalance)` |
| Get leaderboard | `getLeaderboard()` | `(address[], int256[], string[])` |

### For Person 4 — Pay Relay

| Function | Signature | Notes |
|----------|-----------|-------|
| Route fee | `routeSubscriptionFee(address subscriber, address agentAddress, uint256 feeAmount)` | **Only callable by paymentRelayAddress** |

The fee is split:
- `platformFeeBps / 10000` → treasury
- remainder → agent's `creatorWallet`

### For Person 5 — Frontend

#### Read Functions
```solidity
agents(address) → (address creatorWallet, string name, uint256 startingBalanceUSDC, uint256 registrationTime, uint256 totalFeesCollected, bool isActive)
agentList(uint256 index) → address
getAgentPnL(address) → (int256 pnlBps, uint256 startBalance, uint256 latestBalance)
getLeaderboard() → (address[] addrs, int256[] pnls, string[] names)
platformFeeBps() → uint256
treasury() → address
nexusVaultAddress() → address
paymentRelayAddress() → address
```

#### Events
```solidity
event AgentRegistered(address indexed agentAddress, string name, uint256 startingBalanceUSDC);
event PnLSnapshotTaken(address indexed agentAddress, uint256 balanceAtSnapshot, int256 pnlBps);
event SubscriptionFeeRouted(address indexed subscriber, address indexed agentAddress, uint256 feeAmount, uint256 platformCut, uint256 creatorCut);
event AgentDeactivated(address indexed agentAddress);
```

---

## Admin Functions (Owner Only)

### NexusVault
```solidity
setRiskLimits(uint256 _maxDrawdownBps, uint256 _maxPositionSizeBps)
setAgentAuthorization(address agent, bool status)
setPaused(bool _paused)
```

### SignalRegistry
```solidity
setAgentAuthorization(address agent, bool status)
```

### AgentLeaderboard
```solidity
registerAgent(address agentAddress, string calldata name, uint256 startingBalanceUSDC)
setPaymentRelay(address _relay)
setPlatformFeeBps(uint256 _bps)
deactivateAgent(address agentAddress)
```

---

## Deployment

```bash
cd contracts
source .env
forge script script/Deploy.s.sol:Deploy --rpc-url xlayer_testnet --broadcast --chain-id 1952
```

Then extract ABIs:
```bash
node extract_abis.js
```
