# Nexus.AI Setup Guide

This guide will help you set up and run the complete Nexus.AI multi-agent DeFi system for the X Layer Hackathon.

## Prerequisites

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)

## Quick Start (Automated)

The easiest way to get started is using the automated setup script:

```bash
# Make the script executable
chmod +x start.sh

# Run the setup (installs dependencies and starts all services)
./start.sh
```

This will:
- Install OnchainOS skills
- Install all agent dependencies
- Start all 4 agents and the frontend
- Open the dashboard at http://localhost:5173

## Manual Setup

If you prefer to set up each component manually:

### 1. Install OnchainOS Skills

```bash
# Install all OnchainOS skills for DeFi operations
npx skills add okx/onchainos-skills --all -y
```

### 2. Install Agent Dependencies

```bash
# Orchestrator (main trading agent)
cd agents/orchestrator && npm install

# Specialist (yield farming)
cd ../specialist && npm install

# Risk Guardian (risk management)
cd ../risk-guardian && npm install

# Pay Relay (payments)
cd ../pay-relay && npm install

# Frontend (dashboard)
cd ../../frontend && npm install
```

### 3. Configure Environment Variables

Create `.env` files for each agent with your API keys:

#### Orchestrator (.env)
```bash
# Copy template
cp agents/orchestrator/.env.example agents/orchestrator/.env

# Edit with your keys
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key
TEE_PRIVATE_KEY=your_tee_private_key
ONCHAINOS_TEE_API_KEY=your_onchainos_key
PORT=3001
```

#### Pay Relay (.env)
```bash
# Copy template
cp agents/pay-relay/.env.example agents/pay-relay/.env

# Edit with your keys
PRIVATE_KEY=your_private_key_for_payments
ONCHAINOS_X402_API_KEY=your_x402_key
PORT=3004
```

### 4. Build Smart Contracts (Optional)

If you need to modify contracts:

```bash
cd contracts
npm install
forge build
node extract_abis.js
```

### 5. Start Services

Start each service in separate terminals:

```bash
# Terminal 1: Orchestrator (Autonomous Trading)
cd agents/orchestrator && npm run dev

# Terminal 2: Specialist (Yield Farming)
cd agents/specialist && npm run dev

# Terminal 3: Risk Guardian (Risk Management)
cd agents/risk-guardian && npm run dev

# Terminal 4: Pay Relay (Payments)
cd agents/pay-relay && npm run dev

# Terminal 5: Frontend (Dashboard)
cd frontend && npm run dev
```

## Service URLs

Once running, access these endpoints:

- **Frontend Dashboard**: http://localhost:5173
- **Orchestrator API**: http://localhost:3001
- **Specialist API**: http://localhost:3002
- **Risk Guardian API**: http://localhost:3003
- **Pay Relay API**: http://localhost:3004

## API Endpoints

### Orchestrator
- `GET /health` - Health check
- `GET /api/signals` - Recent trading signals
- `GET /api/leaderboard` - Agent performance rankings
- `POST /api/trade` - Manual trade trigger

### Risk Guardian
- `GET /health` - Health check
- `POST /api/validate-trade` - Validate trade against risk limits
- `GET /api/risk-params` - Get current risk parameters

### Pay Relay
- `GET /health` - Health check
- `POST /api/route-subscription-fee` - Route subscription fees
- `POST /api/x402-payment` - Process x402 micropayments

## Testing the System

### 1. Check Health
```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
```

### 2. Test Autonomous Trading
```bash
curl -X POST http://localhost:3001/api/trade
```

### 3. View Signals
```bash
curl http://localhost:3001/api/signals
```

### 4. Check Risk Validation
```bash
curl -X POST http://localhost:3003/api/validate-trade \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"0x...", "tradeAmount":"1000000"}'
```

## Troubleshooting

### Common Issues

1. **"command not found: npx"**
   - Install Node.js from https://nodejs.org/

2. **"skills command not found"**
   - Run: `npm install -g @modelcontextprotocol/skills`

3. **"Cannot find module" errors**
   - Run `npm install` in each agent directory

4. **Port already in use**
   - Change PORT in .env files or kill processes using those ports

5. **OnchainOS skills not working**
   - Ensure skills are installed: `npx skills list`
   - Check API keys in .env files

### Logs and Debugging

- Each agent logs to its terminal
- Check browser console for frontend errors
- Use `curl` commands above to test APIs

## Development

### Project Structure
```
├── agents/                 # Agent services
│   ├── orchestrator/       # Main trading coordinator
│   ├── specialist/         # Yield farming strategies
│   ├── risk-guardian/      # Risk management
│   └── pay-relay/          # Payment processing
├── frontend/               # React dashboard
├── contracts/              # Solidity smart contracts
├── skills/                 # OnchainOS skills
└── docs/                   # Documentation
```

### Adding New Features

1. **New Agent**: Create folder in `agents/`, add package.json, implement in `src/index.ts`
2. **New Contract**: Add to `contracts/src/`, update ABIs
3. **New Skill**: Use `npx skills add <skill-name>`

## Support

- Check the [README.md](README.md) for detailed documentation
- Review [architecture.md](docs/architecture.md) for system design
- See [integration-guide.md](docs/integration-guide.md) for API details

## Next Steps

1. **Configure Real API Keys**: Replace placeholders in .env files
2. **Test on X Layer Testnet**: Deploy contracts and test with real transactions
3. **Customize Strategies**: Modify trading logic in orchestrator
4. **Add Frontend Features**: Extend dashboard with more analytics

Happy hacking! 🚀