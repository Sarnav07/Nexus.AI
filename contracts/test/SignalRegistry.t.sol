// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {SignalRegistry} from "../src/SignalRegistry.sol";

contract SignalRegistryTest is Test {
    SignalRegistry public registry;

    address public owner = address(this);
    address public agentA = address(0xA9E47A);
    address public agentB = address(0xA9E47B);
    address public unauthorized = address(0xBAD);

    address public tokenA = address(0x1111);
    address public tokenB = address(0x2222);

    // Cache signal type constants to avoid consuming prank on staticcall
    bytes32 public sigMarketBuy;
    bytes32 public sigMarketSell;
    bytes32 public sigAddLiq;
    bytes32 public sigRemoveLiq;

    function setUp() public {
        registry = new SignalRegistry();

        // Authorize agents
        registry.setAgentAuthorization(agentA, true);
        registry.setAgentAuthorization(agentB, true);

        // Cache constants
        sigMarketBuy = registry.SIG_MARKET_BUY();
        sigMarketSell = registry.SIG_MARKET_SELL();
        sigAddLiq = registry.SIG_UNISWAP_ADD_LIQ();
        sigRemoveLiq = registry.SIG_UNISWAP_REMOVE_LIQ();
    }

    /* ── Single Signal Logging ────────────────────────── */
    function test_logSignal() public {
        vm.prank(agentA);
        registry.logSignal(
            sigMarketBuy,
            tokenA,
            tokenB,
            1000e6,
            -887220,
            887220
        );

        assertEq(registry.totalSignalsLogged(), 2);
    }

    function test_logSignal_emitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit SignalRegistry.SignalLogged(
            agentA,
            sigMarketBuy,
            tokenA,
            tokenB,
            1000e6,
            -887220,
            887220,
            block.timestamp
        );

        vm.prank(agentA);
        registry.logSignal(
            sigMarketBuy,
            tokenA,
            tokenB,
            1000e6,
            -887220,
            887220
        );
    }

    function test_logSignal_revertsUnauthorized() public {
        vm.prank(unauthorized);
        vm.expectRevert(SignalRegistry.NotAuthorizedAgent.selector);
        registry.logSignal(
            sigMarketBuy,
            tokenA,
            tokenB,
            1000e6,
            0,
            0
        );
    }

    function test_logSignal_multipleSignals() public {
        vm.startPrank(agentA);
        registry.logSignal(sigMarketBuy, tokenA, tokenB, 100e6, 0, 0);
        registry.logSignal(sigMarketSell, tokenB, tokenA, 50e6, 0, 0);
        vm.stopPrank();

        assertEq(registry.totalSignalsLogged(), 3);
    }

    /* ── Batch Signal Logging ─────────────────────────── */
    function test_logSignalBatch() public {
        SignalRegistry.SignalParams[] memory signals = new SignalRegistry.SignalParams[](3);
        signals[0] = SignalRegistry.SignalParams({
            signalType: sigMarketBuy,
            tokenIn: tokenA,
            tokenOut: tokenB,
            amountIn: 100e6,
            tickLower: -887220,
            tickUpper: 887220
        });
        signals[1] = SignalRegistry.SignalParams({
            signalType: sigMarketSell,
            tokenIn: tokenB,
            tokenOut: tokenA,
            amountIn: 50e6,
            tickLower: 0,
            tickUpper: 0
        });
        signals[2] = SignalRegistry.SignalParams({
            signalType: sigAddLiq,
            tokenIn: tokenA,
            tokenOut: tokenB,
            amountIn: 1000e6,
            tickLower: -60000,
            tickUpper: 60000
        });

        vm.prank(agentA);
        registry.logSignalBatch(signals);

        assertEq(registry.totalSignalsLogged(), 4);
    }

    function test_logSignalBatch_revertsEmpty() public {
        SignalRegistry.SignalParams[] memory signals = new SignalRegistry.SignalParams[](0);

        vm.prank(agentA);
        vm.expectRevert(SignalRegistry.EmptySignalData.selector);
        registry.logSignalBatch(signals);
    }

    function test_logSignalBatch_revertsUnauthorized() public {
        SignalRegistry.SignalParams[] memory signals = new SignalRegistry.SignalParams[](1);
        signals[0] = SignalRegistry.SignalParams({
            signalType: sigMarketBuy,
            tokenIn: tokenA,
            tokenOut: tokenB,
            amountIn: 100e6,
            tickLower: 0,
            tickUpper: 0
        });

        vm.prank(unauthorized);
        vm.expectRevert(SignalRegistry.NotAuthorizedAgent.selector);
        registry.logSignalBatch(signals);
    }

    /* ── Admin Tests ──────────────────────────────────── */
    function test_setAgentAuthorization() public {
        registry.setAgentAuthorization(unauthorized, true);
        assertTrue(registry.authorizedAgents(unauthorized));

        registry.setAgentAuthorization(unauthorized, false);
        assertFalse(registry.authorizedAgents(unauthorized));
    }

    function test_setAgentAuthorization_revertsNonOwner() public {
        vm.prank(agentA);
        vm.expectRevert();
        registry.setAgentAuthorization(unauthorized, true);
    }

    /* ── Signal Type Constants ────────────────────────── */
    function test_signalTypeConstants() public view {
        assertEq(
            sigAddLiq,
            keccak256(abi.encodePacked("UNISWAP_V3_ADD_LIQUIDITY"))
        );
        assertEq(
            sigRemoveLiq,
            keccak256(abi.encodePacked("UNISWAP_V3_REMOVE_LIQUIDITY"))
        );
        assertEq(
            sigMarketBuy,
            keccak256(abi.encodePacked("MARKET_BUY"))
        );
        assertEq(
            sigMarketSell,
            keccak256(abi.encodePacked("MARKET_SELL"))
        );
    }

    /* ── Gas Benchmarks ───────────────────────────────── */
    function test_gas_logSignal() public {
        vm.prank(agentA);
        uint256 gasBefore = gasleft();
        registry.logSignal(
            sigMarketBuy,
            tokenA,
            tokenB,
            1000e6,
            0,
            0
        );
        uint256 gasUsed = gasBefore - gasleft();
        // Signal logging should be under 50k gas
        assertLt(gasUsed, 50_000, "Signal logging exceeds 50k gas");
    }

    /* ── Revocation Test ──────────────────────────────── */
    function test_revokeAgent_cannotLog() public {
        registry.setAgentAuthorization(agentA, false);

        vm.prank(agentA);
        vm.expectRevert(SignalRegistry.NotAuthorizedAgent.selector);
        registry.logSignal(
            sigMarketBuy,
            tokenA,
            tokenB,
            100e6,
            0,
            0
        );
    }
}
