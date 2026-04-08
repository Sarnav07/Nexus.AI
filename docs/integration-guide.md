# Nexus.AI — Integration Guide

## For All Teammates: Getting ABIs

After the contracts are built and deployed, ABIs are extracted to shared locations:

```bash
cd contracts
forge build
node extract_abis.js
```

This populates:
- `agents/shared/abis/*.json`
- `frontend/lib/abis/*.json`

---

## Person 2: Orchestrator Agent

### Setup
```javascript
import NexusVaultABI from '../shared/abis/NexusVault.json';
import SignalRegistryABI from '../shared/abis/SignalRegistry.json';
```

### Before Executing a Trade
1. **Check risk limits** against NexusVault:
   ```javascript
   const drawdownOk = await vault.checkDrawdownLimit(userAddress, tradeAmount);
   const positionOk = await vault.checkPositionSize(tradeAmount);
   ```
2. **Log the signal** to SignalRegistry:
   ```javascript
   await signalRegistry.logSignal(
     SIG_MARKET_BUY,  // bytes32 constant
     tokenIn,
     tokenOut,
     amountIn,
     tickLower,       // 0 if not LP
     tickUpper         // 0 if not LP
   );
   ```

### Reading Vault State
```javascript
const balance = await vault.balances(userAddress);
const total = await vault.totalDeposits();
const [drawdownBps, positionBps, isPaused] = await vault.getRiskParams();
```

---

## Person 3: Specialist Agents

### Authorization Requirement
Each specialist agent must be authorized by the contract owner:
```solidity
// Owner calls:
signalRegistry.setAgentAuthorization(specialistAddress, true);
nexusVault.setAgentAuthorization(specialistAddress, true);
```

### Logging Signals
Use the same `logSignal` / `logSignalBatch` pattern as the Orchestrator.

### Signal Type Constants
```
MARKET_BUY:                keccak256("MARKET_BUY")
MARKET_SELL:               keccak256("MARKET_SELL")
UNISWAP_V3_ADD_LIQUIDITY:  keccak256("UNISWAP_V3_ADD_LIQUIDITY")
UNISWAP_V3_REMOVE_LIQUIDITY: keccak256("UNISWAP_V3_REMOVE_LIQUIDITY")
```

---

## Person 4: Risk Guardian / Pay Relay

### Risk Guardian
Read risk parameters and validate trades:
```javascript
const [drawdownBps, positionBps, isPaused] = await vault.getRiskParams();
const drawdownOk = await vault.checkDrawdownLimit(user, tradeUSDC);
const positionOk = await vault.checkPositionSize(tradeUSDC);
```

### Pay Relay
1. Get authorized as payment relay:
   ```solidity
   agentLeaderboard.setPaymentRelay(relayAddress);  // Owner only
   ```
2. Route subscription fees:
   ```javascript
   await agentLeaderboard.routeSubscriptionFee(subscriberAddr, agentAddr, feeAmount);
   ```
   The subscriber must have approved the AgentLeaderboard contract for USDC.

---

## Person 5: Frontend

### Contract Reads (no gas)
```javascript
// NexusVault
const balance = await vault.balances(userAddress);
const totalDeposits = await vault.totalDeposits();
const hwm = await vault.highWaterMark(userAddress);
const riskParams = await vault.getRiskParams();

// AgentLeaderboard
const [addrs, pnls, names] = await leaderboard.getLeaderboard();
const [pnlBps, startBal, latestBal] = await leaderboard.getAgentPnL(agentAddr);

// SignalRegistry
const totalSignals = await signalRegistry.totalSignalsLogged(); // actual count = value - 1
```

### Contract Writes (user pays gas in OKB)
```javascript
// Deposit flow
await usdc.approve(vaultAddress, amount);
await vault.deposit(amount);

// Withdraw flow
await vault.withdraw(amount);
```

### Event Subscriptions
Use `eth_getLogs` or `watchContractEvent` for real-time updates:
- `Deposited(user, amount)` — Vault deposits
- `Withdrawn(user, amount)` — Vault withdrawals
- `SignalLogged(agent, type, tokenIn, ...)` — Live trading signals
- `PnLSnapshotTaken(agent, balance, pnlBps)` — PnL updates
- `SubscriptionFeeRouted(subscriber, agent, fee, ...)` — Fee events

---

## Network Configuration

| Parameter   | Value |
|-------------|-------|
| Chain ID    | 1952 |
| RPC URL     | `https://testrpc.xlayer.tech` |
| Gas Token   | OKB |
| Block Explorer | X Layer Testnet Explorer |
| USDC Address | `0x74b7f16337b8972027f6196a17a631ac6de26d22` |

## Deployed Contract Addresses

| Contract           | Address                                      |
|--------------------|----------------------------------------------|
| NexusVault         | `0x39fcc4a32840e2685bb8c4b034b25e678536d06d` |
| SignalRegistry     | `0xe3757836b1aced9f037534c9748755d35bb2abb9` |
| AgentLeaderboard   | `0x7282b04bd6601a1b7e7efe9d0c89ca302b00f84e` |

