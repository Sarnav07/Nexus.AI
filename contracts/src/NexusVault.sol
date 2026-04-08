// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/* ── IMPORTS ──────────────────────────────────────────── */
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  NexusVault
 * @notice Custodies user USDC deposits. Enforces per-vault risk limits
 *         that the Risk Guardian agent reads before approving any trade.
 *         This contract is the single source of truth for position limits
 *         and drawdown rules.
 */
contract NexusVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ── CUSTOM ERRORS ────────────────────────────────── */
    error ExceedsMaxDrawdown(uint256 requested, uint256 limit);
    error ExceedsMaxPositionSize(uint256 requested, uint256 limit);
    error InsufficientBalance(uint256 available, uint256 requested);
    error VaultPaused();
    error ZeroAmount();
    error NotAuthorizedAgent();

    /* ── EVENTS ───────────────────────────────────────── */
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RiskLimitsUpdated(uint256 maxDrawdownBps, uint256 maxPositionBps);
    event AgentAuthorized(address indexed agent, bool status);

    /* ── STATE VARIABLES ──────────────────────────────── */
    IERC20 public immutable usdc;

    /// @notice user → USDC balance (6 decimals)
    mapping(address => uint256) public balances;

    /// @notice Sum of all deposited USDC
    uint256 public totalDeposits;

    /// @notice Max drawdown in basis points (e.g. 1000 = 10%)
    uint256 public maxDrawdownBps;

    /// @notice Max single-position size in basis points (e.g. 500 = 5%)
    uint256 public maxPositionSizeBps;

    /// @notice Emergency pause flag
    bool public paused;

    /// @notice Agents authorized to interact with the vault
    mapping(address => bool) public authorizedAgents;

    /// @notice High-water marks for PnL tracking: user → peak balance
    mapping(address => uint256) public highWaterMark;

    /* ── CONSTRUCTOR ──────────────────────────────────── */
    constructor(
        address _usdc,
        uint256 _maxDrawdownBps,
        uint256 _maxPositionSizeBps
    ) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        maxDrawdownBps = _maxDrawdownBps;
        maxPositionSizeBps = _maxPositionSizeBps;
        emit RiskLimitsUpdated(_maxDrawdownBps, _maxPositionSizeBps);
    }

    /* ── MODIFIERS ────────────────────────────────────── */
    modifier whenNotPaused() {
        if (paused) revert VaultPaused();
        _;
    }

    /* ── DEPOSIT ──────────────────────────────────────── */
    /**
     * @notice Deposit USDC into the vault.
     * @param  amount  Amount of USDC (6 decimals) to deposit.
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        balances[msg.sender] += amount;
        totalDeposits += amount;

        // Update high-water mark if new balance exceeds existing peak
        if (balances[msg.sender] > highWaterMark[msg.sender]) {
            highWaterMark[msg.sender] = balances[msg.sender];
        }

        emit Deposited(msg.sender, amount);
    }

    /* ── WITHDRAW ─────────────────────────────────────── */
    /**
     * @notice Withdraw USDC from the vault.
     * @param  amount  Amount of USDC (6 decimals) to withdraw.
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (balances[msg.sender] < amount) {
            revert InsufficientBalance(balances[msg.sender], amount);
        }

        balances[msg.sender] -= amount;
        totalDeposits -= amount;

        usdc.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /* ── RISK ENFORCEMENT ─────────────────────────────── */
    /**
     * @notice  Check whether a proposed trade fits within the user's
     *          drawdown limit.
     * @param   user               The user whose drawdown is checked.
     * @param   proposedTradeUSDC  Trade size in USDC (6 decimals).
     * @return  ok  True if the trade is within the drawdown limit.
     */
    function checkDrawdownLimit(
        address user,
        uint256 proposedTradeUSDC
    ) external view returns (bool ok) {
        uint256 currentBalance = balances[user];
        uint256 hwm = highWaterMark[user];
        if (hwm == 0) return true; // No history yet

        uint256 maxAllowedLoss = (hwm * maxDrawdownBps) / 10_000;
        uint256 currentLoss = hwm > currentBalance ? hwm - currentBalance : 0;
        uint256 projectedLoss = currentLoss + proposedTradeUSDC;

        ok = projectedLoss <= maxAllowedLoss;
    }

    /**
     * @notice  Check whether a proposed trade fits within the global
     *          position-size limit.
     * @param   proposedTradeUSDC  Trade size in USDC (6 decimals).
     * @return  ok  True if the trade is within the position limit.
     */
    function checkPositionSize(
        uint256 proposedTradeUSDC
    ) external view returns (bool ok) {
        ok = proposedTradeUSDC <= (totalDeposits * maxPositionSizeBps) / 10_000;
    }

    /* ── ADMIN FUNCTIONS (onlyOwner) ──────────────────── */
    /**
     * @notice Update the risk-limit parameters.
     */
    function setRiskLimits(
        uint256 _maxDrawdownBps,
        uint256 _maxPositionSizeBps
    ) external onlyOwner {
        maxDrawdownBps = _maxDrawdownBps;
        maxPositionSizeBps = _maxPositionSizeBps;
        emit RiskLimitsUpdated(_maxDrawdownBps, _maxPositionSizeBps);
    }

    /**
     * @notice Authorize or revoke an agent.
     */
    function setAgentAuthorization(
        address agent,
        bool status
    ) external onlyOwner {
        authorizedAgents[agent] = status;
        emit AgentAuthorized(agent, status);
    }

    /**
     * @notice Pause or unpause the vault.
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    /* ── VIEW HELPERS ─────────────────────────────────── */
    /**
     * @notice  Returns current risk parameters.
     * @dev     Person 4 (Risk Guardian) calls this view function.
     */
    function getRiskParams()
        external
        view
        returns (uint256 drawdownBps, uint256 positionBps, bool isPaused)
    {
        drawdownBps = maxDrawdownBps;
        positionBps = maxPositionSizeBps;
        isPaused = paused;
    }
}
