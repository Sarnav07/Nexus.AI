import { Contract, JsonRpcProvider } from 'ethers';
import { generateAccessToken } from './middleware';

export const pendingInvoices = new Map<string, string>(); // txHash -> jwt

export function startOnChainListener(
    leaderboardAddress: string,
    rpcUrl: string
) {
    const provider = new JsonRpcProvider(rpcUrl);
    const abi = [
        "event SubscriptionFeeRouted(address indexed subscriber, address indexed agentAddress, uint256 feeAmount, uint256 platformCut, uint256 creatorCut)"
    ];

    const leaderboardContract = new Contract(leaderboardAddress, abi, provider);

    console.log(`[PAY RELAY] Listening for SubscriptionFeeRouted on ${leaderboardAddress}...`);

    leaderboardContract.on("SubscriptionFeeRouted", (subscriber: string, agentAddress: string, feeAmount: bigint, platformCut: bigint, creatorCut: bigint, event: any) => {
        const txHash = event.log ? event.log.transactionHash : "unknown";
        console.log(`[PAY RELAY] Recognized Payment from ${subscriber} for Agent ${agentAddress}`);

        // Generate Token
        const jwt = generateAccessToken(subscriber, agentAddress, txHash);

        // Store so a frontend polling endpoint could securely retrieve it
        pendingInvoices.set(txHash, jwt);
    });
}
