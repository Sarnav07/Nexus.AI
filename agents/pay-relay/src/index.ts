import express from 'express';
import cors from 'cors';
import { x402Middleware } from './middleware';
import { startOnChainListener, pendingInvoices } from './onchain';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3004;

// Mock configuration loaded from environment or injected
const CONFIG = {
    rpcUrl: "https://testrpc.xlayer.tech",
    leaderboardAddress: "0xaaa0f4583d3529aa9a99b736f7971983f16e7972", // from docs
    agentAddress: process.env.AGENT_ADDRESS || "0xMySpecialistAgentAddress",
    feeAmountStr: "10000000", // e.g. 10 USDC
};

// Start Blockchain Listener
startOnChainListener(CONFIG.leaderboardAddress, CONFIG.rpcUrl);

// Public route to retrieve an access token using a known txHash of a valid payment
app.get('/verify-payment/:txHash', (req, res) => {
    const txHash = req.params.txHash;
    const token = pendingInvoices.get(txHash);
    if (!token) {
        res.status(404).json({ status: "pending or invalid" });
    } else {
        res.json({ token, status: "verified" });
    }
});

// Protected Agent Route
app.get('/api/agent-signals',
    x402Middleware(CONFIG.leaderboardAddress, CONFIG.agentAddress, CONFIG.feeAmountStr),
    (req, res) => {
        res.json({
            message: "Success! You have navigated past the x402 Pay Relay.",
            premiumSignals: [
                { token: "ETH", opportunity: "ARB", confidence: 0.99 }
            ]
        });
    }
);

app.listen(PORT, () => {
    console.log(`[PAY RELAY Server] Operating on http://localhost:${PORT}`);
});
