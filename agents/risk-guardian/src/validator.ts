import { Contract, JsonRpcProvider } from 'ethers';
import chalk from 'chalk';

const ALLOWLISTED_TOKENS = [
    "0x74b7f16337b8972027f6196a17a631ac6de26d22", // USDC
    "0xokb...fakeaddress",                      // OKB
    "0xapprovedtoken......................1"
].map(t => t.toLowerCase());

export class GuardianValidator {
    private vaultContract: Contract;
    private provider: JsonRpcProvider;

    constructor(vaultAddress: string, rpcUrl: string) {
        this.provider = new JsonRpcProvider(rpcUrl);
        const abi = [
            "function checkDrawdownLimit(address user, uint256 proposedTradeUSDC) view returns (bool)",
            "function checkPositionSize(uint256 proposedTradeUSDC) view returns (bool)",
            "function getRiskParams() view returns (uint256 drawdownBps, uint256 positionBps, bool isPaused)"
        ];
        this.vaultContract = new Contract(vaultAddress, abi, this.provider);
    }

    async validateTrade(
        userAddress: string,
        amountUSDC: bigint,
        tokenIn: string,
        tokenOut: string,
        target: string,
        data: string,
        value: string
    ): Promise<boolean> {
        try {
            // CHECK 1: ALLOWLIST Validation
            if (!ALLOWLISTED_TOKENS.includes(tokenIn.toLowerCase()) || !ALLOWLISTED_TOKENS.includes(tokenOut.toLowerCase())) {
                console.log(chalk.red(`\n[RISK GUARDIAN: BLOCKED] - TARGET TOKEN NOT ON VAULT ALLOWLIST [In: ${tokenIn}, Out: ${tokenOut}]`));
                return false;
            }
            console.log(chalk.yellow(`[RISK GUARDIAN: CHECK 1 PASSED] Token Allowlist`));

            const isPaused = (await this.vaultContract.getRiskParams())[2];
            if (isPaused) {
                console.log(chalk.red('\n[RISK GUARDIAN: BLOCKED] - VAULT IS PAUSED'));
                return false;
            }

            // CHECK 2: DRAWDOWN & POSITION SIZE
            const drawdownOk = await this.vaultContract.checkDrawdownLimit(userAddress, amountUSDC);
            if (!drawdownOk) {
                console.log(chalk.red(`\n[RISK GUARDIAN: BLOCKED] - MAX DRAWDOWN EXCEEDED FOR USER [${userAddress}]`));
                return false;
            }
            const positionOk = await this.vaultContract.checkPositionSize(amountUSDC);
            if (!positionOk) {
                console.log(chalk.red(`\n[RISK GUARDIAN: BLOCKED] - PROPOSED POSITION EXCEEDS MAX ALLOWED`));
                return false;
            }
            console.log(chalk.yellow(`[RISK GUARDIAN: CHECK 2 PASSED] Position & Drawdown Limits`));

            // CHECK 3: GAS ESTIMATION
            try {
                const gasEstimate = await this.provider.estimateGas({
                    from: userAddress, // Ensure simulating from correct sender
                    to: target,
                    data: data,
                    value: BigInt(value || "0")
                });

                // 5,000,000 gas limit hard stop for sanity logic
                if (gasEstimate > BigInt(5000000)) {
                    console.log(chalk.red(`\n[RISK GUARDIAN: BLOCKED] - EXCESSIVE GAS USAGE PREDICATED (${gasEstimate.toString()})`));
                    return false;
                }
                console.log(chalk.yellow(`[RISK GUARDIAN: CHECK 3 PASSED] Gas Simulation (${gasEstimate.toString()})`));
            } catch (err: any) {
                // Reverts in simulation
                console.log(chalk.red(`\n[RISK GUARDIAN: BLOCKED] - ON-CHAIN SIMULATION REVERTED. TX WILL FAIL.`));
                console.log(chalk.red(`Reason: ${err.message || 'Unknown revert'}`));
                return false;
            }

            console.log(chalk.green(`\n[RISK GUARDIAN] ✔ FULL APPROVAL GRANTED FOR [${userAddress}]`));
            return true;
        } catch (error) {
            console.log(chalk.red(`\n[RISK GUARDIAN] UNEXPECTED SYSTEM ERROR DURNG VALIDATION:`));
            return false; // Fail secure
        }
    }
}
