import { TradePayload, TradePayloadSchema } from './schemas';
import { GuardianValidator } from './validator';
import chalk from 'chalk';

export async function runRiskGuardianCheck(
    payload: unknown,
    userAddress: string,
    vaultAddress: string,
    rpcUrl: string
): Promise<boolean> {
    console.log(chalk.blue('\n[RISK GUARDIAN] INTERCEPTING SPECIALIST PAYLOAD...'));

    const parseResult = TradePayloadSchema.safeParse(payload);
    if (!parseResult.success) {
        console.log(chalk.red('\n[RISK GUARDIAN: BLOCKED] - INVALID PAYLOAD SCHEMA'));
        return false;
    }

    const tradeData = parseResult.data;

    let amountUSDC: bigint;
    try {
        amountUSDC = BigInt(tradeData.metadata.amountInRaw);
    } catch (e) {
        console.log(chalk.red('\n[RISK GUARDIAN: BLOCKED] - CANNOT PARSE amountInRaw'));
        return false;
    }

    const tokenIn = typeof tradeData.metadata.tokenIn === 'string' ? tradeData.metadata.tokenIn : "";
    const tokenOut = typeof tradeData.metadata.tokenOut === 'string' ? tradeData.metadata.tokenOut : "";

    const validator = new GuardianValidator(vaultAddress, rpcUrl);
    return await validator.validateTrade(
        userAddress,
        amountUSDC,
        tokenIn,
        tokenOut,
        tradeData.target,
        tradeData.data,
        tradeData.value
    );
}

export * from './schemas';
export * from './validator';
