# Nexus.AI — Phase 4 Handoff (Risk Guardian & Pay Relay)

This documentation serves as the final integration checklist for the Nexus.AI hackathon team, outlining all modules finalized by Person 4 (Risk/Relay) and exactly what every other team member must do to complete Phase 4 (Integration).

## ✅ What Person 4 Has Delivered
1. **`agents/risk-guardian`** module fully configured with a strict TS Validator checking:
   - **`checkDrawdownLimit`** (via NexusVault.sol)
   - **`checkPositionSize`** (via NexusVault.sol)
   - **`Token Allowlist Check`** (prevents buying scam coins)
   - **`Gas Consumption Check`** (Simulates execution via `eth_estimateGas` to ensure <= 5M OKB gas).
2. **`agents/pay-relay`** API fully configured:
   - **`x402Middleware`** for gating Next.js requests to the Orchestrator with `402 Payment Required`.
   - **`startOnChainListener`** to natively pick up `SubscriptionFeeRouted` events and securely generate JWTs.
3. **`test/red-team.ts`** Stress Tests fully written displaying colorful terminal interception logs for the live presentation.

---

## 🛠️ Action Items for the Rest of the Team

### For Person 1 (Smart Contracts)
- **Whitelisting**: You must call `agentLeaderboard.setPaymentRelay(0xYourPayRelayNodeWallet)` on your deployed contract or the Pay Relay will not be able to process payments.
- **Gas Provisioning**: Ensure that the `target` wallets your agents are using have been funded with OKB testnet gas to run the `estimateGas` checks on `testrpc.xlayer.tech`.

### For Person 2 (Orchestrator)
- **Install Package**: Run `npm install ../risk-guardian` inside the orchestrator dir.
- **Add the Firewall**: In your main Intent Execution Loop, right before you call `wallet.sendTransaction`, you must insert:
  ```typescript
  import { runRiskGuardianCheck } from 'risk-guardian/src';
  
  const isSafe = await runRiskGuardianCheck(
      specialistTradePayload,
      userWalletAddress,
      VAULT_ADDRESS,
      RPC_URL
  );
  if (!isSafe) { /* Stop execution! */ }
  ```
- **Proxy Endpoints**: Mount the `pay-relay` express middleware directly in front of the premium Orchestrator endpoints you expose to the frontend.

### For Person 3 (Specialist)
- **Ensure Schemas Match**: The Risk Guardian's Zod schemas expect your final Zod output to contain:
  - `target`, `data`, `value`, `chainId`
  - `metadata.tokenIn`, `metadata.tokenOut`, `metadata.amountInRaw`
- *No additional work required, just ensure your outputs conform!*

### For Person 5 (Frontend)
- **Environment Prep**: Have Person 4 give you the Live URL of the Pay Relay server if it's hosted, or proxy it locally to port 3004.
- **Catch 402 Errors**: Update your API fetchers. If you receive a `402 Payment Required`, you need to:
  1. Read the `invoice` JSON from the error payload.
  2. Use Wagmi/Viem to execute `routeSubscriptionFee(address,address,uint256)` on `AgentLeaderboard` paying `amountRequiredUSDC`.
  3. Once the transaction resolves on X Layer, poll `http://pay-relay:3004/verify-payment/:txHash`.
  4. Save the returned `token` into LocalStorage and attach it as `Authorization: Bearer <token>` for all future fetches.

---

> Let’s plug these pieces in and nail the live presentation!
