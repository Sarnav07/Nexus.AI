// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {AgentLeaderboard} from "../src/AgentLeaderboard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/* ── Mock ERC20 for testing ───────────────────────────── */
contract MockUSDC {
    string public name = "Mock USDC";
    string public symbol = "USDC";
    uint8 public decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient");
        require(allowance[from][msg.sender] >= amount, "allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

contract AgentLeaderboardTest is Test {
    AgentLeaderboard public leaderboard;
    MockUSDC public usdc;

    address public owner = address(this);
    address public vaultAddr = address(0xFA017);
    address public treasury = address(0x7BEA5);
    address public relay = address(0xBE1A4);
    address public agentAlpha = address(0xA1FA);
    address public agentBeta = address(0xBE7A);
    address public subscriber = address(0x50B);

    uint256 constant PLATFORM_FEE_BPS = 500; // 5%

    function setUp() public {
        usdc = new MockUSDC();
        leaderboard = new AgentLeaderboard(
            address(usdc),
            vaultAddr,
            treasury,
            PLATFORM_FEE_BPS
        );

        // Set payment relay
        leaderboard.setPaymentRelay(relay);

        // Fund subscriber
        usdc.mint(subscriber, 100_000e6);
        vm.prank(subscriber);
        usdc.approve(address(leaderboard), type(uint256).max);
    }

    /* ── Agent Registration ───────────────────────────── */
    function test_registerAgent() public {
        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);

        (
            address creatorWallet,
            string memory agentName,
            uint256 startingBal,
            uint256 regTime,
            uint256 fees,
            bool isActive
        ) = leaderboard.agents(agentAlpha);

        assertEq(creatorWallet, owner);
        assertEq(agentName, "Alpha Agent");
        assertEq(startingBal, 10_000e6);
        assertGt(regTime, 0);
        assertEq(fees, 0);
        assertTrue(isActive);
    }

    function test_registerAgent_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit AgentLeaderboard.AgentRegistered(agentAlpha, "Alpha Agent", 10_000e6);

        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);
    }

    function test_registerAgent_revertsDouble() public {
        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);

        vm.expectRevert(AgentLeaderboard.AgentAlreadyRegistered.selector);
        leaderboard.registerAgent(agentAlpha, "Alpha Agent v2", 20_000e6);
    }

    function test_registerAgent_revertsNonOwner() public {
        vm.prank(subscriber);
        vm.expectRevert();
        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);
    }

    /* ── PnL Snapshot ─────────────────────────────────── */
    function test_takeSnapshot() public {
        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);

        leaderboard.takeSnapshot(agentAlpha, 11_000e6);

        (int256 pnlBps, uint256 startBal, uint256 latestBal) = leaderboard
            .getAgentPnL(agentAlpha);

        assertEq(startBal, 10_000e6);
        assertEq(latestBal, 11_000e6);
        // PnL: ((11000 - 10000) * 10000) / 10000 = 1000 bps = +10%
        assertEq(pnlBps, 1000);
    }

    function test_takeSnapshot_negativePnL() public {
        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);

        leaderboard.takeSnapshot(agentAlpha, 8_000e6);

        (int256 pnlBps, , ) = leaderboard.getAgentPnL(agentAlpha);
        // PnL: ((8000 - 10000) * 10000) / 10000 = -2000 bps = -20%
        assertEq(pnlBps, -2000);
    }

    function test_takeSnapshot_breakEven() public {
        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);

        leaderboard.takeSnapshot(agentAlpha, 10_000e6);

        (int256 pnlBps, , ) = leaderboard.getAgentPnL(agentAlpha);
        assertEq(pnlBps, 0);
    }

    function test_takeSnapshot_revertsUnregistered() public {
        vm.expectRevert(AgentLeaderboard.AgentNotRegistered.selector);
        leaderboard.takeSnapshot(address(0xDEAD), 5_000e6);
    }

    function test_takeSnapshot_emitsEvent() public {
        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);

        vm.expectEmit(true, false, false, true);
        // PnL: ((12000 - 10000) * 10000) / 10000 = 2000 bps
        emit AgentLeaderboard.PnLSnapshotTaken(agentAlpha, 12_000e6, 2000);

        leaderboard.takeSnapshot(agentAlpha, 12_000e6);
    }

    /* ── PnL View (no snapshots) ──────────────────────── */
    function test_getAgentPnL_noSnapshots() public {
        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);

        (int256 pnlBps, uint256 startBal, uint256 latestBal) = leaderboard
            .getAgentPnL(agentAlpha);

        assertEq(pnlBps, 0);
        assertEq(startBal, 10_000e6);
        assertEq(latestBal, 10_000e6); // defaults to startBalance
    }

    /* ── Leaderboard View ─────────────────────────────── */
    function test_getLeaderboard() public {
        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);
        leaderboard.registerAgent(agentBeta, "Beta Agent", 5_000e6);

        leaderboard.takeSnapshot(agentAlpha, 12_000e6); // +20%
        leaderboard.takeSnapshot(agentBeta, 4_000e6);   // -20%

        (
            address[] memory addrs,
            int256[] memory pnls,
            string[] memory names
        ) = leaderboard.getLeaderboard();

        assertEq(addrs.length, 2);
        assertEq(addrs[0], agentAlpha);
        assertEq(addrs[1], agentBeta);
        assertEq(pnls[0], 2000);  // +20% in bps
        assertEq(pnls[1], -2000); // -20% in bps
        assertEq(names[0], "Alpha Agent");
        assertEq(names[1], "Beta Agent");
    }

    function test_getLeaderboard_empty() public view {
        (
            address[] memory addrs,
            int256[] memory pnls,
            string[] memory names
        ) = leaderboard.getLeaderboard();

        assertEq(addrs.length, 0);
        assertEq(pnls.length, 0);
        assertEq(names.length, 0);
    }

    /* ── Subscription Fee Routing ─────────────────────── */
    function test_routeSubscriptionFee() public {
        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);

        uint256 feeAmount = 1000e6; // 1000 USDC
        // Platform cut: 5% = 50 USDC
        // Creator cut: 95% = 950 USDC

        uint256 treasuryBefore = usdc.balanceOf(treasury);
        uint256 creatorBefore = usdc.balanceOf(owner); // creator is owner

        vm.prank(relay);
        leaderboard.routeSubscriptionFee(subscriber, agentAlpha, feeAmount);

        uint256 platformCut = (feeAmount * PLATFORM_FEE_BPS) / 10_000;
        uint256 creatorCut = feeAmount - platformCut;

        assertEq(usdc.balanceOf(treasury), treasuryBefore + platformCut);
        assertEq(usdc.balanceOf(owner), creatorBefore + creatorCut);
    }

    function test_routeSubscriptionFee_emitsEvent() public {
        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);

        uint256 feeAmount = 1000e6;
        uint256 platformCut = (feeAmount * PLATFORM_FEE_BPS) / 10_000;
        uint256 creatorCut = feeAmount - platformCut;

        vm.expectEmit(true, true, false, true);
        emit AgentLeaderboard.SubscriptionFeeRouted(
            subscriber,
            agentAlpha,
            feeAmount,
            platformCut,
            creatorCut
        );

        vm.prank(relay);
        leaderboard.routeSubscriptionFee(subscriber, agentAlpha, feeAmount);
    }

    function test_routeSubscriptionFee_revertsNotRelay() public {
        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);

        vm.prank(subscriber);
        vm.expectRevert(AgentLeaderboard.NotPaymentRelay.selector);
        leaderboard.routeSubscriptionFee(subscriber, agentAlpha, 100e6);
    }

    function test_routeSubscriptionFee_revertsUnregisteredAgent() public {
        vm.prank(relay);
        vm.expectRevert(AgentLeaderboard.AgentNotRegistered.selector);
        leaderboard.routeSubscriptionFee(subscriber, address(0xDEAD), 100e6);
    }

    function test_routeSubscriptionFee_revertsZeroAmount() public {
        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);

        vm.prank(relay);
        vm.expectRevert(AgentLeaderboard.ZeroAmount.selector);
        leaderboard.routeSubscriptionFee(subscriber, agentAlpha, 0);
    }

    /* ── Admin Tests ──────────────────────────────────── */
    function test_setPaymentRelay() public {
        address newRelay = address(0xBE1A5);
        leaderboard.setPaymentRelay(newRelay);
        assertEq(leaderboard.paymentRelayAddress(), newRelay);
    }

    function test_setPaymentRelay_revertsZeroAddress() public {
        vm.expectRevert(AgentLeaderboard.ZeroAddress.selector);
        leaderboard.setPaymentRelay(address(0));
    }

    function test_setPlatformFeeBps() public {
        leaderboard.setPlatformFeeBps(1000);
        assertEq(leaderboard.platformFeeBps(), 1000);
    }

    function test_deactivateAgent() public {
        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);
        leaderboard.deactivateAgent(agentAlpha);

        (, , , , , bool isActive) = leaderboard.agents(agentAlpha);
        assertFalse(isActive);
    }

    function test_deactivateAgent_emitsEvent() public {
        leaderboard.registerAgent(agentAlpha, "Alpha Agent", 10_000e6);

        vm.expectEmit(true, false, false, false);
        emit AgentLeaderboard.AgentDeactivated(agentAlpha);

        leaderboard.deactivateAgent(agentAlpha);
    }

    function test_deactivateAgent_revertsUnregistered() public {
        vm.expectRevert(AgentLeaderboard.AgentNotRegistered.selector);
        leaderboard.deactivateAgent(address(0xDEAD));
    }

    /* ── Fuzz Test: PnL Math ──────────────────────────── */
    function testFuzz_pnlMath(
        uint256 startBal,
        uint256 currentBal
    ) public {
        // Bound to reasonable USDC values (avoid zero-division, int256 overflow)
        startBal = bound(startBal, 1e6, 1_000_000_000e6);   // 1 to 1B USDC
        currentBal = bound(currentBal, 0, 2_000_000_000e6); // 0 to 2B USDC

        leaderboard.registerAgent(agentAlpha, "Fuzz Agent", startBal);
        leaderboard.takeSnapshot(agentAlpha, currentBal);

        (int256 pnlBps, , uint256 latestBalance) = leaderboard.getAgentPnL(agentAlpha);

        assertEq(latestBalance, currentBal);

        // Verify PnL calculation manually
        // casting to 'int256' is safe because values are bounded by fuzz bounds above
        // forge-lint: disable-next-line(unsafe-typecast)
        int256 expectedPnl = (int256(currentBal) - int256(startBal)) * 10_000 / int256(startBal);
        assertEq(pnlBps, expectedPnl);
    }
}
