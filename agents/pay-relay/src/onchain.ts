import { Contract, JsonRpcProvider } from 'ethers';
import { generateAccessToken } from './middleware';

export const pendingInvoices = new Map<string, string>(); // txHash -> jwt

let lastProcessedBlock: number = 0;

export async function startOnChainListener(
    leaderboardAddress: string,
    rpcUrl: string
) {
    const provider = new JsonRpcProvider(rpcUrl);
    const abi = [
        "event SubscriptionFeeRouted(address indexed subscriber, address indexed agentAddress, uint256 feeAmount, uint256 platformCut, uint256 creatorCut)"
    ];

    const leaderboardContract = new Contract(leaderboardAddress, abi, provider);

    console.log(`[PAY RELAY] Polling for SubscriptionFeeRouted on ${leaderboardAddress}...`);

    // Initialize lastProcessedBlock
    lastProcessedBlock = await provider.getBlockNumber();

    // Poll every 10 seconds
    setInterval(async () => {
        try {
            const currentBlock = await provider.getBlockNumber();
            if (currentBlock > lastProcessedBlock) {
                const events = await leaderboardContract.queryFilter("SubscriptionFeeRouted", lastProcessedBlock + 1, currentBlock);
                for (const event of events) {
                    const { subscriber, agentAddress, feeAmount, platformCut, creatorCut } = (event as any).args;
                    const txHash = event.transactionHash;
                    console.log(`[PAY RELAY] Recognized Payment from ${subscriber} for Agent ${agentAddress}`);

                    // Generate Token
                    const jwt = generateAccessToken(subscriber, agentAddress, txHash);

                    // Store so a frontend polling endpoint could securely retrieve it
                    pendingInvoices.set(txHash, jwt);
                }
                lastProcessedBlock = currentBlock;
            }
        } catch (error) {
            console.error('[PAY RELAY] Error polling events:', error);
        }
    }, 10000); // 10 seconds
}
