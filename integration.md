# Nexus.AI — Frontend Integration & Execution Plan

**Version:** 2.0 (Revised after full PRD & codebase cross-reference)  
**Status:** Awaiting Approval  
**Scope:** Transform the static Vite + React UI into a fully functional Web3 dApp wired to all smart contracts and Orchestrator APIs, implementing the complete experience defined in the UI/UX PRD.

---

## User Review Required

> [!IMPORTANT]
> This plan was revised after reading the full 1,334-line PRD. Significant changes from v1 include: **4 new missing pages** (Leaderboard, Activity, Agent Detail, Vault Detail), a complete **wallet connection state machine**, a **read-only demo mode**, coverage of the `/api/vault/:address` endpoint, `useAgentPnL` hook for per-agent drilldown, PRD-mandated **skeleton loaders**, full **state matrix** handling, and accessibility/reduced-motion requirements. Please review before approving execution.

---

## 1. Codebase Assessment (Current vs. Target State)

### What is currently built

| File | Current State |
|---|---|
| `main.tsx` | Bare React root mount, no providers |
| `App.tsx` | Has `QueryClientProvider` + Router, but **no Web3 provider**, only 3 routes |
| `Navbar.tsx` | Static "Connect Wallet" button, no wallet SDK, no status indicator |
| `Index.tsx` | Static hero with hardcoded TVL, agent count, APY stats |
| `Dashboard.tsx` | Hardcoded mock balances, PnL, agent name, activity feed |
| `VaultModal.tsx` | 2-step UI shell is built with `setTimeout` mocks, no real RPC calls |
| `TerminalView.tsx` | Hardcoded scrolling log, no chat input, no streaming |
| `Terminal.tsx` | Page shell only — no `/api/chat` wiring |
| `src/hooks/` | Only `use-mobile.tsx` + `use-toast.ts` — zero Web3 hooks |
| `src/lib/` | Only `utils.ts` (cn helper) — no ABI exports, no contract config |

### Critical structural gaps vs. PRD

- **Missing pages**: `/leaderboard`, `/activity`, `/agents/[id]`, `/vault` — all required by PRD §7.1 and §24
- **Missing wallet stack**: `wagmi`, `viem`, RainbowKit — nothing installed
- **Missing global state**: `zustand` not installed
- **Missing ABI layer**: `src/lib/contracts/` directory with typed ABIs, addresses, chain config
- **Missing custom hooks**: All 5 Web3 hooks need to be created from scratch
- **No demo/read-only mode**: PRD §11.7 requires unconnected users see real platform TVL and blurred personal cards
- **No skeleton loaders**: PRD §10.10 requires shape-matching skeletons, not spinners
- **No chain mismatch handling**: PRD §25.1 defines 4 connection states including chain mismatch
- **No reduced-motion support**: PRD §20.5 accessibility requirement
- **`/api/vault/:address` endpoint unused**: Orchestrator provides this rich endpoint; plan v1 missed it

---

## 2. State Management & Custom Hooks Strategy

### Architecture: Dual-Layer State

```
┌────────────────────────────────────────────────────┐
│  wagmi (chain state)   ←→  RPC / smart contracts   │
│  - useAccount                                      │
│  - useReadContract                                 │
│  - useWriteContract                                │
│  - useWaitForTransactionReceipt                    │
│  - useWatchContractEvent                           │
├────────────────────────────────────────────────────┤
│  TanStack Query (server state) ← Orchestrator API  │
│  - /api/health                                     │
│  - /api/leaderboard                                │
│  - /api/vault/:address                             │
│  - /api/signals/count                              │
├────────────────────────────────────────────────────┤
│  Zustand (ephemeral UI state)                      │
│  - activeModal, orchestratorStatus, riskParams     │
└────────────────────────────────────────────────────┘
```

### Custom Hooks to Build

| Hook | Reads | Writes | Notes |
|---|---|---|---|
| `useNexusVault(userAddress?)` | `balances`, `highWaterMark`, `totalDeposits`, `getRiskParams` | `deposit()`, `withdraw()` | Wraps 4 parallel `useReadContract` calls + 2 write flows |
| `useUSDCAllowance(userAddress)` | `usdc.allowance(user, vaultAddr)` | `usdc.approve(vaultAddr, amount)` | Drives Step 1 of deposit flow |
| `useAgentLeaderboard()` | `/api/leaderboard` (primary) + `getLeaderboard()` (fallback) | — | TanStack Query with 30s refetch interval |
| `useAgentPnL(agentAddress)` | `getAgentPnL(agentAddress)` | — | Per-agent detail drill-down |
| `useSignalFeed()` | `/api/signals/count` (poll) + `SignalLogged` event (watch) | — | Powers Activity page + toast notifications |
| `useOrchestratorChat()` | `/api/chat` (streaming), `/api/chat/complete` (sync) | — | Exposes `sendMessage(messages)` + `streamResponse` |
| `useOrchestratorHealth()` | `/api/health` | — | 15s polling heartbeat, drives Navbar status dot |

### Zustand Store Shape

```typescript
interface AppStore {
  // Orchestrator health
  orchestratorStatus: 'online' | 'degraded' | 'offline';
  setOrchestratorStatus: (s: AppStore['orchestratorStatus']) => void;

  // Risk params (global, not user-specific)
  riskParams: { maxDrawdownBps: number; maxPositionSizeBps: number; isPaused: boolean } | null;
  setRiskParams: (p: AppStore['riskParams']) => void;

  // Modal state
  activeModal: 'deposit' | 'withdraw' | null;
  setModal: (m: AppStore['activeModal']) => void;
}
```

> [!NOTE]
> Wallet address, chain ID, and per-user balances are **never** stored in Zustand — they live in `wagmi` context only, avoiding stale-closure bugs.

---

## 3. The Integration Matrix (Exhaustive Component→Endpoint Map)

### 3.1 New Routes Required (not in current `App.tsx`)

| Route | Page | Priority |
|---|---|---|
| `/` | `Index.tsx` (exists) | — |
| `/dashboard` | `Dashboard.tsx` (exists, needs wiring) | P0 |
| `/terminal` | `Terminal.tsx` (exists, needs wiring) | P1 |
| `/leaderboard` | `Leaderboard.tsx` **(NEW)** | P1 |
| `/activity` | `Activity.tsx` **(NEW)** | P1 |
| `/agents/:id` | `AgentDetail.tsx` **(NEW)** | P2 |
| `/vault` | `VaultDetail.tsx` **(NEW)** | P2 |

### 3.2 Full Component → Endpoint Matrix

| Component | Data Needed | Source | Contract Function / API Route | Method |
|---|---|---|---|---|
| **`Navbar` — Status dot** | Orchestrator alive? | Off-chain | `/api/health` | `useOrchestratorHealth` |
| **`Navbar` — Wallet button** | Connected address, chain | `wagmi` | `useAccount`, `useChainId` | — |
| **`Index.tsx` — Stats bar** | Platform TVL, agent count | On-chain + Off-chain | `NexusVault.totalDeposits` + `/api/leaderboard` | `useReadContract` + fetch |
| **`Dashboard` — Portfolio value** | User's vault balance | On-chain | `NexusVault.balances(user)` | `useNexusVault` |
| **`Dashboard` — High-Water Mark** | User peak balance | On-chain | `NexusVault.highWaterMark(user)` | `useNexusVault` |
| **`Dashboard` — TVL** | Total locked | On-chain | `NexusVault.totalDeposits` | `useNexusVault` |
| **`Dashboard` — Risk posture** | Drawdown ceiling, pause | On-chain | `NexusVault.getRiskParams()` | `useNexusVault` |
| **`Dashboard` — Agent mini-card** | Top agent name, PnL | Off-chain | `/api/leaderboard` (rank 1) | `useAgentLeaderboard` |
| **`Dashboard` — Signal count** | Total executions | Off-chain | `/api/signals/count` | `useSignalFeed` |
| **`Dashboard` — Live feed preview** | 3 latest signals | On-chain | `SignalLogged` event | `useWatchContractEvent` |
| **`Dashboard` — Vault paused banner** | Pause state | Zustand / on-chain | `getRiskParams().isPaused` | `useNexusVault` → Zustand |
| **`VaultModal` — Step 0 (max balance)** | User USDC wallet balance | On-chain | `IERC20.balanceOf(user)` | `useReadContract` |
| **`VaultModal` — Step 1 (approve)** | Current allowance | On-chain | `IERC20.allowance(user, vault)` | `useUSDCAllowance` |
| **`VaultModal` — Step 1 (sign)** | Approval tx | On-chain | `IERC20.approve(vault, amount)` | `useWriteContract` |
| **`VaultModal` — Step 2 (deposit)** | Deposit tx | On-chain | `NexusVault.deposit(amount)` | `useWriteContract` |
| **`VaultModal` — Withdraw** | Withdraw tx | On-chain | `NexusVault.withdraw(amount)` | `useWriteContract` |
| **`TerminalView` — Chat input** | Prompt response | Off-chain | `/api/chat` (stream) | `useOrchestratorChat` |
| **`TerminalView` — Sync query** | One-shot response | Off-chain | `/api/chat/complete` | `useOrchestratorChat` |
| **`Leaderboard.tsx`** | All agents, ranks, PnL | Off-chain | `/api/leaderboard` | `useAgentLeaderboard` |
| **`Leaderboard.tsx` — PnL drill** | Per-agent PnL bps | On-chain | `AgentLeaderboard.getAgentPnL(addr)` | `useAgentPnL` |
| **`Activity.tsx` — Feed** | Live signal events | On-chain | `SignalLogged` event stream | `useSignalFeed` |
| **`Activity.tsx` — Total count** | Execution count | Off-chain | `/api/signals/count` | fetch |
| **`AgentDetail.tsx` — Profile** | Agent metadata | On-chain | `AgentLeaderboard.agents(addr)` | `useReadContract` |
| **`AgentDetail.tsx` — PnL chart** | Snapshot history | On-chain | `AgentLeaderboard.snapshotHistory(addr, i)` | `useReadContract` |
| **`VaultDetail.tsx`** | Full user vault data | Off-chain | `/api/vault/:address` | fetch |
| **`VaultDetail.tsx` — Risk** | Risk params | On-chain | `NexusVault.getRiskParams()` | `useNexusVault` |

> [!NOTE]
> Every single Orchestrator endpoint (`/api/health`, `/api/leaderboard`, `/api/vault/:address`, `/api/signals/count`, `/api/chat`, `/api/chat/complete`) and every public contract function is now mapped to a UI surface. Nothing is orphaned.

---

## 4. Edge Case & Error Handling Blueprint

### 4.1 Wallet Connection State Machine

The PRD (§25.1) defines 4 connection states. Here is the exact UI behavior for each:

| State | Navbar | Dashboard Cards | Quick Actions |
|---|---|---|---|
| `not-connected` | "Connect Wallet" CTA | Blurred skeleton with lock icon + "Connect to view" | Deposit/Withdraw visible but open wallet modal on click |
| `connecting` | Spinner + "Connecting..." | Unchanged (blurred) | Disabled with spinner |
| `chain-mismatch` | Orange "Wrong Network" badge | Warning banner: "Switch to X Layer Testnet" | Disabled, show switch-chain button |
| `connected` | Truncated `0x...` + ENS + Disconnect | Full data, progressive loads | Fully enabled |

### 4.2 The 2-Step USDC Deposit Flow (State Machine)

```
IDLE
  → [User enters amount > 0]
AMOUNT_SET
  → [Click "1. Approve USDC"]
APPROVE_PENDING_SIGNATURE   ← show wallet spinner
  → [User rejects]          → IDLE (sonner: "Approval cancelled")
  → [User signs]
APPROVE_CONFIRMING          ← show pulsing confirm state, NOT closed modal
  → [Receipt confirmed]     →
DEPOSIT_READY               ← auto-advance, preserve amount, show Step 2
  → [Click "2. Deposit"]
DEPOSIT_PENDING_SIGNATURE   ← show wallet spinner again
  → [User rejects]          → DEPOSIT_READY (sonner: "Deposit cancelled")
  → [User signs]
DEPOSIT_CONFIRMING          ← show block confirmation spinner
  → [Receipt confirmed]     →
SUCCESS                     ← refetch balances, success toast, close modal
```

> [!IMPORTANT]
> We **must** read `usdc.allowance(user, vaultAddress)` on modal open. If allowance >= amount already (e.g., from a prior session), skip Step 1 entirely and show Step 2 directly.

### 4.3 Smart Contract Reverts — UI Handlers

| Revert Error | Trigger Condition | UI Response |
|---|---|---|
| `ZeroAmount()` | amount = 0 | Button disabled; never reaches chain |
| `VaultPaused()` | `isPaused === true` | Global warning banner on Dashboard + disabled buttons with tooltip: "Vault temporarily paused for user protection." |
| `InsufficientBalance(available, requested)` | withdraw > `balances[user]` | Input capped to `balanceOf(user)`; "Max" button enforces this |
| `NotAuthorizedAgent()` | Agent not whitelisted | Surface in Activity feed as "Blocked" status chip |
| Generic RPC error | Network issues | `sonner` error toast with retry CTA |

### 4.4 USDC Decimal Precision

> [!CAUTION]
> USDC uses **6 decimals**, not 18. All `parseUnits` calls must use `parseUnits(amount, 6)`. All `formatUnits` display calls must use `formatUnits(rawValue, 6)`. The VaultModal already has a 6-decimal input guard — this must carry through to all RPC call sites.

### 4.5 RPC Read Staleness After Writes

After any successful transaction receipt:
1. Call `refetch()` on all active `useReadContract` queries (wagmi `invalidateQueries`).
2. Display a "Data refreshing..." subtle chip near updated cards for 2–3 seconds.
3. Do NOT optimistically update balances — wait for the confirmed refetch.

### 4.6 Orchestrator API Failure Fallback

| Endpoint down | Fallback Behavior |
|---|---|
| `/api/health` offline | Navbar dot = orange (degraded). TerminalView shows "Swarm connection unavailable." |
| `/api/leaderboard` fails | Fall back to direct `getLeaderboard()` RPC call. Show "Live data unavailable — displaying on-chain snapshot." |
| `/api/signals/count` fails | Hide the count metric; show skeleton indefinitely |
| `/api/vault/:address` fails | Fall back to individual `useReadContract` reads for balance, HWM, totalDeposits |
| `/api/chat` fails | TerminalView shows error state: "Agent swarm unreachable. Try again." with retry button |

### 4.7 Additional PRD Edge Cases (§26)

- **Long agent names / addresses**: Truncate to `0x1234...abcd` with a copy-to-clipboard icon. Full address shown on hover via `<Tooltip>`.
- **Empty leaderboard**: Show editorial empty state: heading + description + "No strategies registered yet." (no action CTA until agents exist).
- **Partial refresh failure**: If leaderboard loads but vault data fails, show leaderboard fully + error state only in the vault card. Do not blank the whole page.
- **Rank change animation**: Use Framer Motion `layout` prop on leaderboard rows — positions animate physically, not as value updates.
- **Stale feed**: Show a "Last updated Xm ago" freshness indicator on the Activity feed. If data is >5 min old, surface an amber "Stale" chip.

---

## 5. Phased Execution Roadmap

### Phase 1 — Web3 Foundation (Blocker for everything)
- [ ] Install: `wagmi`, `viem`, `@rainbow-me/rainbowkit`, `zustand`
- [ ] Create `src/lib/contracts/index.ts` — export typed ABIs (`NexusVaultABI`, `AgentLeaderboardABI`, `SignalRegistryABI`) + contract addresses per chain
- [ ] Create `src/lib/wagmi-config.ts` — configure X Layer Testnet chain, RPC URL, connectors
- [ ] Wrap `main.tsx`: `WagmiProvider` → `QueryClientProvider` → `RainbowKitProvider` → `App`
- [ ] Replace `Navbar.tsx` static "Connect Wallet" button with RainbowKit `<ConnectButton>`
- [ ] Add Orchestrator health status dot to Navbar using `useOrchestratorHealth`
- [ ] Create `src/store/appStore.ts` (Zustand store)
- [ ] Add chain-mismatch warning banner component

### Phase 2 — Read Layer: Dashboard + Landing
- [ ] Build `useNexusVault(userAddress)` hook
- [ ] Build `useUSDCAllowance(userAddress)` hook
- [ ] Wire `Dashboard.tsx` — replace all mock values with real `useNexusVault` data
- [ ] Wire `Dashboard.tsx` — replace hardcoded agent card with `/api/leaderboard` rank-1 result
- [ ] Wire `Dashboard.tsx` — replace static activity feed with `useWatchContractEvent` for `SignalLogged`
- [ ] Wire `Dashboard.tsx` — add vault paused global banner from `getRiskParams().isPaused`
- [ ] Wire `Index.tsx` stats bar — replace mock TVL/agent count with live data
- [ ] Add skeleton loaders to all data cards (shape-matched per PRD §10.10)
- [ ] Add read-only demo mode: blur personal cards + show "Connect Wallet" CTA when not connected

### Phase 3 — Write Layer: Vault Transactions
- [ ] Refactor `VaultModal.tsx` — replace `setTimeout` mock with real `useWriteContract` calls
- [ ] Implement the 5-state deposit state machine (see §4.2)
- [ ] Read and respect existing `usdc.allowance` — skip Step 1 if already sufficient
- [ ] Implement `withdraw()` flow with `InsufficientBalance` guard
- [ ] Wire success/failure `sonner` toasts with block explorer deep-link
- [ ] Add `useWaitForTransactionReceipt` confirmation spinner
- [ ] Trigger balance refetch after receipt confirmed
- [ ] Disable Deposit/Withdraw buttons when `isPaused === true`

### Phase 4 — New Pages: Leaderboard, Activity, Agent Detail, Vault Detail
- [ ] Build `Leaderboard.tsx` page — table + sort/filter controls, using `useAgentLeaderboard`
- [ ] Build agent detail `Drawer` component — PnL chart, signals, address copy
- [ ] Wire `AgentDetail.tsx` — `getAgentPnL(addr)` + `snapshotHistory`
- [ ] Build `Activity.tsx` page — live `SignalLogged` event feed with filters
- [ ] Build `SignalProofDrawer` — raw signal params, tx hash, approval/block status chip
- [ ] Build `VaultDetail.tsx` — pull all data from `/api/vault/:address` + on-chain fallback
- [ ] Add routes `/leaderboard`, `/activity`, `/agents/:id`, `/vault` to `App.tsx`
- [ ] Update Navbar `NAV_ITEMS` to include Leaderboard + Activity links
- [ ] Add rank-change Framer Motion `layout` animation on leaderboard rows

### Phase 5 — Chat/Streaming Terminal & Polish
- [ ] Build `useOrchestratorChat` hook wrapping `/api/chat` ReadableStream
- [ ] Add text input + submit to `TerminalView.tsx` (currently display-only)
- [ ] Pipe streaming chunks into the terminal log with a cursor indicator
- [ ] Add "Swarm unreachable" fallback state when `/api/chat` fails
- [ ] Wire `useNonStreamingChat` via `/api/chat/complete` for mobile fallback
- [ ] Implement `prefers-reduced-motion` CSS media query support across all Framer Motion components
- [ ] Accessibility audit: ARIA labels on dialogs, keyboard trap in modals, focus rings, contrast check
- [ ] Final QA state matrix walkthrough: all 26 states from PRD §25 verified
