import 'dotenv/config';
import { teeWalletService } from '../services/onchainos-wallet.js';
import { CONTRACTS } from '../config/contracts.js';
import { encodeFunctionData } from 'viem';

// ABI fragment just for logging a minimal signal to keep the agent active
const SignalRegistryABI = [
  {
    type: 'function',
    name: 'logTradeSignal',
    inputs: [
      { name: 'agent', type: 'address' },
      { name: 'signalType', type: 'string' },
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' }
    ],
    outputs: []
  }
];

const mockTokens = [
  '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // WETH
  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
  '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', // BTC
];

function getRandomToken() {
  return mockTokens[Math.floor(Math.random() * mockTokens.length)];
}

async function runFarm() {
  console.log(`\n🚜 Starting X Layer Transaction Farm (Target: Most Active Agent)`);
  console.log(`📡 Agentic Wallet Address: ${teeWalletService.address}`);
  console.log(`⏳ Heartbeat: 45 seconds`);

  // Loop indefinitely
  let nonce = 0;
  while (true) {
    nonce++;
    console.log(`\n[Nonce: ${nonce}] Generating synthetic agent intent...`);
    
    try {
      const tokenIn = getRandomToken();
      let tokenOut = getRandomToken();
      while(tokenOut === tokenIn) tokenOut = getRandomToken();

      const data = encodeFunctionData({
        abi: SignalRegistryABI,
        functionName: 'logTradeSignal',
        args: [teeWalletService.address, 'MARKET_BUY_FARM_SIMULATION', tokenIn, tokenOut],
      });

      console.log(`[Nonce: ${nonce}] 🤖 Sending to OnchainOS TEE Wallet for secure signing`);
      const result = await teeWalletService.signAndBroadcast({
        to: CONTRACTS.SignalRegistry as `0x${string}`,
        data,
      });

      if (result.success) {
        console.log(`[Nonce: ${nonce}] ✅ Success! Tx Hash: ${result.txHash} | Gas: ${result.gasUsed}`);
      } else {
        console.error(`[Nonce: ${nonce}] ❌ Failed:`, result.error);
      }
    } catch (e: any) {
      console.error(`[Nonce: ${nonce}] ❌ System error:`, e.message);
    }

    // Wait 45 seconds before the next trade to avoid rate limits
    await new Promise(r => setTimeout(r, 45000));
  }
}

// Start the farm
runFarm().catch(console.error);
