// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {NexusVault} from "../src/NexusVault.sol";
import {SignalRegistry} from "../src/SignalRegistry.sol";
import {AgentLeaderboard} from "../src/AgentLeaderboard.sol";

/**
 * @title  Deploy
 * @notice Deploys the three Nexus contracts to X Layer Testnet.
 *
 *   Usage:
 *     source .env
 *     forge script script/Deploy.s.sol:Deploy \
 *       --rpc-url xlayer_testnet \
 *       --broadcast \
 *       --chain-id 195
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        address treasuryAddress = vm.envAddress("TREASURY_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // ── 1. Deploy NexusVault ─────────────────────────
        // maxDrawdownBps = 1000 (10%), maxPositionSizeBps = 500 (5%)
        NexusVault nexusVault = new NexusVault(
            usdcAddress,
            1000,
            500
        );
        console.log("NexusVault deployed at:", address(nexusVault));

        // ── 2. Deploy SignalRegistry ─────────────────────
        SignalRegistry signalRegistry = new SignalRegistry();
        console.log("SignalRegistry deployed at:", address(signalRegistry));

        // ── 3. Deploy AgentLeaderboard ───────────────────
        // platformFeeBps = 500 (5%)
        AgentLeaderboard agentLeaderboard = new AgentLeaderboard(
            usdcAddress,
            address(nexusVault),
            treasuryAddress,
            500
        );
        console.log("AgentLeaderboard deployed at:", address(agentLeaderboard));

        vm.stopBroadcast();

        // ── Summary ──────────────────────────────────────
        console.log("========================================");
        console.log("  NEXUS DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("  NexusVault:        ", address(nexusVault));
        console.log("  SignalRegistry:    ", address(signalRegistry));
        console.log("  AgentLeaderboard:  ", address(agentLeaderboard));
        console.log("========================================");
    }
}
