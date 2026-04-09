import { runRiskGuardianCheck } from '../src/index';

async function main() {
    const vaultAddress = "0x7b6483fbb5d1716a1e26cb9d99257673dfd6eee7";
    const rpcUrl = "https://testrpc.xlayer.tech";
    const userAddress = "0x4444444444444444444444444444444444444444";

    console.log("=========================================");
    console.log("🧨 INITIATING RED TEAM STRESS TESTS 🧨");
    console.log("=========================================");

    // Test 1: Unapproved token address
    console.log("\n>>> SCENARIO 1: Specialist tries to trade for unapproved scam token");
    const maliciousPayload1 = {
        chainId: 1952,
        target: vaultAddress, // mocking
        data: "0x123",
        metadata: {
            tokenIn: "0x74b7f16337b8972027f6196a17a631ac6de26d22", // USDC
            tokenOut: "0xScamCoin9999999999999999999999999999999", // SCAM
            amountInRaw: "100"
        }
    };
    await runRiskGuardianCheck(maliciousPayload1, userAddress, vaultAddress, rpcUrl);

    // Test 2: Try to consume 100% of the vault (massive position size)
    console.log("\n>>> SCENARIO 2: Specialist attempts massive trade exceeding position limits");
    const maliciousPayload2 = {
        chainId: 1952,
        target: vaultAddress, // mocking
        data: "0x123",
        metadata: {
            tokenIn: "0x74b7f16337b8972027f6196a17a631ac6de26d22", // USDC
            tokenOut: "0x74b7f16337b8972027f6196a17a631ac6de26d22", // Same, valid
            amountInRaw: "99999999999999999999990000000000000000" // Massive amount
        }
    };
    await runRiskGuardianCheck(maliciousPayload2, userAddress, vaultAddress, rpcUrl);

    // Test 3: Simulation failure (garbage data causes revert)
    console.log("\n>>> SCENARIO 3: Specialist crafts failing execution bundle");
    const maliciousPayload3 = {
        chainId: 1952,
        target: vaultAddress,
        data: "0xdeadbeef", // Random bad data that reverts
        metadata: {
            tokenIn: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
            tokenOut: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
            amountInRaw: "10" // Acceptable value but TX will revert
        }
    };
    await runRiskGuardianCheck(maliciousPayload3, userAddress, vaultAddress, rpcUrl);
}

main().catch(console.error);
