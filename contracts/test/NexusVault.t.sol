// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {NexusVault} from "../src/NexusVault.sol";
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

contract NexusVaultTest is Test {
    NexusVault public vault;
    MockUSDC public usdc;

    address public owner = address(this);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public agent = address(0xA9E47);

    uint256 constant INITIAL_BALANCE = 10_000e6; // 10,000 USDC
    uint256 constant MAX_DRAWDOWN_BPS = 1000;    // 10%
    uint256 constant MAX_POSITION_BPS = 500;     // 5%

    function setUp() public {
        usdc = new MockUSDC();
        vault = new NexusVault(
            address(usdc),
            MAX_DRAWDOWN_BPS,
            MAX_POSITION_BPS
        );

        // Fund test users
        usdc.mint(alice, INITIAL_BALANCE);
        usdc.mint(bob, INITIAL_BALANCE);

        // Approve vault
        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(vault), type(uint256).max);
    }

    /* ── Deposit Tests ────────────────────────────────── */
    function test_deposit() public {
        vm.prank(alice);
        vault.deposit(1000e6);

        assertEq(vault.balances(alice), 1000e6);
        assertEq(vault.totalDeposits(), 1000e6);
        assertEq(vault.highWaterMark(alice), 1000e6);
        assertEq(usdc.balanceOf(address(vault)), 1000e6);
    }

    function test_deposit_updatesHighWaterMark() public {
        vm.startPrank(alice);
        vault.deposit(500e6);
        assertEq(vault.highWaterMark(alice), 500e6);

        vault.deposit(500e6);
        assertEq(vault.highWaterMark(alice), 1000e6);
        vm.stopPrank();
    }

    function test_deposit_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit NexusVault.Deposited(alice, 1000e6);

        vm.prank(alice);
        vault.deposit(1000e6);
    }

    function test_deposit_revertsOnZero() public {
        vm.prank(alice);
        vm.expectRevert(NexusVault.ZeroAmount.selector);
        vault.deposit(0);
    }

    function test_deposit_revertsWhenPaused() public {
        vault.setPaused(true);

        vm.prank(alice);
        vm.expectRevert(NexusVault.VaultPaused.selector);
        vault.deposit(1000e6);
    }

    /* ── Withdraw Tests ───────────────────────────────── */
    function test_withdraw() public {
        vm.prank(alice);
        vault.deposit(1000e6);

        vm.prank(alice);
        vault.withdraw(400e6);

        assertEq(vault.balances(alice), 600e6);
        assertEq(vault.totalDeposits(), 600e6);
        assertEq(usdc.balanceOf(alice), INITIAL_BALANCE - 1000e6 + 400e6);
    }

    function test_withdraw_revertsOnInsufficientBalance() public {
        vm.prank(alice);
        vault.deposit(100e6);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                NexusVault.InsufficientBalance.selector,
                100e6,
                200e6
            )
        );
        vault.withdraw(200e6);
    }

    function test_withdraw_revertsOnZero() public {
        vm.prank(alice);
        vm.expectRevert(NexusVault.ZeroAmount.selector);
        vault.withdraw(0);
    }

    function test_withdraw_revertsWhenPaused() public {
        vm.prank(alice);
        vault.deposit(1000e6);

        vault.setPaused(true);

        vm.prank(alice);
        vm.expectRevert(NexusVault.VaultPaused.selector);
        vault.withdraw(500e6);
    }

    function test_withdraw_emitsEvent() public {
        vm.prank(alice);
        vault.deposit(1000e6);

        vm.expectEmit(true, false, false, true);
        emit NexusVault.Withdrawn(alice, 500e6);

        vm.prank(alice);
        vault.withdraw(500e6);
    }

    /* ── Drawdown Limit Tests ─────────────────────────── */
    function test_checkDrawdownLimit_passesWithinRange() public {
        vm.prank(alice);
        vault.deposit(1000e6);

        // HWM = 1000e6, maxDrawdownBps = 1000 (10%)
        // maxAllowedLoss = 100e6
        // currentLoss = 0, proposedTrade = 50e6 → 50 <= 100 → ok
        bool ok = vault.checkDrawdownLimit(alice, 50e6);
        assertTrue(ok);
    }

    function test_checkDrawdownLimit_failsWhenExceeded() public {
        vm.prank(alice);
        vault.deposit(1000e6);

        // proposedTrade = 150e6 → 150 > 100 → NOT ok
        bool ok = vault.checkDrawdownLimit(alice, 150e6);
        assertFalse(ok);
    }

    function test_checkDrawdownLimit_exactBoundary() public {
        vm.prank(alice);
        vault.deposit(1000e6);

        // proposedTrade = 100e6 → 100 == 100 → ok (edge case)
        bool ok = vault.checkDrawdownLimit(alice, 100e6);
        assertTrue(ok);
    }

    function test_checkDrawdownLimit_noHistory() public view {
        // User with no deposits should return true
        bool ok = vault.checkDrawdownLimit(address(0xDEAD), 500e6);
        assertTrue(ok);
    }

    /* ── Position Size Tests ──────────────────────────── */
    function test_checkPositionSize_passesWithinRange() public {
        vm.prank(alice);
        vault.deposit(10_000e6);

        // totalDeposits = 10_000e6, maxPositionBps = 500 (5%)
        // maxPositionSize = 500e6
        bool ok = vault.checkPositionSize(400e6);
        assertTrue(ok);
    }

    function test_checkPositionSize_failsWhenExceeded() public {
        vm.prank(alice);
        vault.deposit(10_000e6);

        bool ok = vault.checkPositionSize(600e6);
        assertFalse(ok);
    }

    function test_checkPositionSize_exactBoundary() public {
        vm.prank(alice);
        vault.deposit(10_000e6);

        bool ok = vault.checkPositionSize(500e6);
        assertTrue(ok);
    }

    /* ── Admin Tests ──────────────────────────────────── */
    function test_setRiskLimits() public {
        vault.setRiskLimits(2000, 1000);
        assertEq(vault.maxDrawdownBps(), 2000);
        assertEq(vault.maxPositionSizeBps(), 1000);
    }

    function test_setRiskLimits_emitsEvent() public {
        vm.expectEmit(false, false, false, true);
        emit NexusVault.RiskLimitsUpdated(2000, 1000);
        vault.setRiskLimits(2000, 1000);
    }

    function test_setRiskLimits_revertsNonOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.setRiskLimits(2000, 1000);
    }

    function test_setAgentAuthorization() public {
        vault.setAgentAuthorization(agent, true);
        assertTrue(vault.authorizedAgents(agent));

        vault.setAgentAuthorization(agent, false);
        assertFalse(vault.authorizedAgents(agent));
    }

    function test_setPaused() public {
        vault.setPaused(true);
        assertTrue(vault.paused());

        vault.setPaused(false);
        assertFalse(vault.paused());
    }

    /* ── View Helpers ─────────────────────────────────── */
    function test_getRiskParams() public view {
        (uint256 drawdownBps, uint256 positionBps, bool isPaused) = vault
            .getRiskParams();
        assertEq(drawdownBps, MAX_DRAWDOWN_BPS);
        assertEq(positionBps, MAX_POSITION_BPS);
        assertFalse(isPaused);
    }

    function test_getRiskParams_afterUpdate() public {
        vault.setRiskLimits(3000, 750);
        vault.setPaused(true);

        (uint256 drawdownBps, uint256 positionBps, bool isPaused) = vault
            .getRiskParams();
        assertEq(drawdownBps, 3000);
        assertEq(positionBps, 750);
        assertTrue(isPaused);
    }

    /* ── Fuzz Tests ───────────────────────────────────── */
    function testFuzz_deposit_withdraw(uint256 depositAmt, uint256 withdrawAmt) public {
        depositAmt = bound(depositAmt, 1, INITIAL_BALANCE);
        withdrawAmt = bound(withdrawAmt, 1, depositAmt);

        vm.startPrank(alice);
        vault.deposit(depositAmt);
        vault.withdraw(withdrawAmt);
        vm.stopPrank();

        assertEq(vault.balances(alice), depositAmt - withdrawAmt);
    }
}
