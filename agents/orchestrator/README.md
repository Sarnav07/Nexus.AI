# Nexus Orchestrator Agent

The central coordinator for Nexus.AI's multi-agent DeFi trading system.

## Features

- **Autonomous Trading**: Scheduled market analysis and trade execution every 5 minutes
- **Risk Management**: Integrates with Risk Guardian for position limits and drawdown control
- **OnchainOS Integration**: Uses OKX OnchainOS skills for secure DeFi operations
- **Signal Logging**: Records all trades to SignalRegistry for transparency
- **API Endpoints**: Provides data feeds for frontend dashboard
- **USDG Token Support**: Query USDG balances and request signed transfers on X Layer testnet

## USDG Functionality

The orchestrator now supports USDG token operations on X Layer testnet:

### API Endpoints for USDG

- `GET /api/usdg-balance/:address` - Query USDG balance for a wallet address
- `POST /api/usdg-transfer-request` - Request user to sign a message for USDG transfer

### USDG Transfer Request

To request a USDG transfer, send a POST request to `/api/usdg-transfer-request`:

```json
{
  "userAddress": "0x1234...",
  "amount": "100.0",
  "reason": "Deposit to Nexus Vault"
}
```

This will generate a structured message that the user can sign in their wallet to authorize the transfer.

### Configuration

Update the USDG contract address in `src/config/chain.ts`:

```typescript
export const CONTRACTS = {
  // ... other contracts
  USDG: '0x1234567890123456789012345678901234567890', // Your USDG contract address
};
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```bash
cp .env.example .env
# Edit .env with your actual API keys and wallet addresses
```

3. Build and run:
```bash
npm run build
npm start
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/signals` - Recent trading signals
- `GET /api/leaderboard` - Agent performance rankings
- `POST /api/trade` - Manual trade trigger (testing)

## Autonomous Trading

The orchestrator runs a cron job every 5 minutes that:
1. Fetches market data via OnchainOS
2. Analyzes price movements and volume
3. Checks risk limits with Risk Guardian
4. Executes trades using OnchainOS skills
5. Logs signals to SignalRegistry

## Security

- Uses OnchainOS TEE wallet for secure transactions
- Implements risk checks before each trade
- Logs all activities on-chain for transparency