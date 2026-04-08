// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/* ── IMPORTS ──────────────────────────────────────────── */
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  AgentLeaderboard
 * @notice Accounting + reputation layer. Tracks registered AI agents,
 *         calculates their PnL, and routes x402 subscription fees.
 */
contract AgentLeaderboard is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ── STRUCTS ──────────────────────────────────────── */
    struct AgentProfile {
        address creatorWallet;
        string name;
        uint256 startingBalanceUSDC;
        uint256 registrationTime;
        uint256 totalFeesCollected;
        bool isActive;
    }

    struct PnLSnapshot {
        uint256 snapshotTime;
        uint256 balanceAtSnapshot;
    }

    /* ── CUSTOM ERRORS ────────────────────────────────── */
    error AgentAlreadyRegistered();
    error AgentNotRegistered();
    error NotPaymentRelay();
    error ZeroAddress();
    error ZeroAmount();

    /* ── EVENTS ───────────────────────────────────────── */
    event AgentRegistered(
        address indexed agentAddress,
        string name,
        uint256 startingBalanceUSDC
    );
    event PnLSnapshotTaken(
        address indexed agentAddress,
        uint256 balanceAtSnapshot,
        int256 pnlBps
    );
    event SubscriptionFeeRouted(
        address indexed subscriber,
        address indexed agentAddress,
        uint256 feeAmount,
        uint256 platformCut,
        uint256 creatorCut
    );
    event AgentDeactivated(address indexed agentAddress);

    /* ── STATE VARIABLES ──────────────────────────────── */
    IERC20 public immutable usdc;

    mapping(address => AgentProfile) public agents;
    address[] public agentList;
    mapping(address => PnLSnapshot[]) public snapshotHistory;

    address public nexusVaultAddress;
    address public paymentRelayAddress;

    /// @notice Platform fee in basis points (e.g. 500 = 5%)
    uint256 public platformFeeBps;

    /// @notice Treasury address for platform fee collection
    address public treasury;

    /* ── CONSTRUCTOR ──────────────────────────────────── */
    constructor(
        address _usdc,
        address _vault,
        address _treasury,
        uint256 _platformFeeBps
    ) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        nexusVaultAddress = _vault;
        treasury = _treasury;
        platformFeeBps = _platformFeeBps;
    }

    /* ── AGENT REGISTRATION ───────────────────────────── */
    /**
     * @notice Register a new AI agent on the leaderboard.
     * @param  agentAddress        The agent's on-chain address.
     * @param  name                Human-readable agent name.
     * @param  startingBalanceUSDC Starting balance for PnL calculation.
     */
    function registerAgent(
        address agentAddress,
        string calldata name,
        uint256 startingBalanceUSDC
    ) external onlyOwner {
        if (agents[agentAddress].registrationTime != 0)
            revert AgentAlreadyRegistered();

        agents[agentAddress] = AgentProfile({
            creatorWallet: msg.sender,
            name: name,
            startingBalanceUSDC: startingBalanceUSDC,
            registrationTime: block.timestamp,
            totalFeesCollected: 0,
            isActive: true
        });

        agentList.push(agentAddress);

        emit AgentRegistered(agentAddress, name, startingBalanceUSDC);
    }

    /* ── PNL SNAPSHOT ─────────────────────────────────── */
    /**
     * @notice Take a PnL snapshot for an agent.
     * @param  agentAddress        The agent to snapshot.
     * @param  currentBalanceUSDC  The agent's current USDC balance.
     */
    function takeSnapshot(
        address agentAddress,
        uint256 currentBalanceUSDC
    ) external {
        if (agents[agentAddress].registrationTime == 0)
            revert AgentNotRegistered();

        snapshotHistory[agentAddress].push(
            PnLSnapshot({
                snapshotTime: block.timestamp,
                balanceAtSnapshot: currentBalanceUSDC
            })
        );

        // Calculate PnL in basis points: ((current - start) * 10000) / start
        int256 pnlBps;
        uint256 startBalance = agents[agentAddress].startingBalanceUSDC;
        if (startBalance > 0) {
            // casting to 'int256' is safe because USDC balances are bounded well below int256 max
            // forge-lint: disable-start(unsafe-typecast)
            pnlBps =
                (int256(currentBalanceUSDC) - int256(startBalance)) *
                10_000 /
                int256(startBalance);
            // forge-lint: disable-end(unsafe-typecast)
        }

        emit PnLSnapshotTaken(agentAddress, currentBalanceUSDC, pnlBps);
    }

    /* ── PNL VIEW ─────────────────────────────────────── */
    /**
     * @notice Get the PnL for an agent based on latest snapshot.
     * @param  agentAddress  The agent to query.
     * @return pnlBps        PnL in basis points (can be negative).
     * @return startBalance  The agent's starting balance.
     * @return latestBalance The agent's latest snapshot balance.
     */
    function getAgentPnL(
        address agentAddress
    )
        external
        view
        returns (int256 pnlBps, uint256 startBalance, uint256 latestBalance)
    {
        if (agents[agentAddress].registrationTime == 0)
            revert AgentNotRegistered();

        startBalance = agents[agentAddress].startingBalanceUSDC;

        PnLSnapshot[] storage history = snapshotHistory[agentAddress];
        if (history.length > 0) {
            latestBalance = history[history.length - 1].balanceAtSnapshot;
        } else {
            latestBalance = startBalance;
        }

        if (startBalance > 0) {
            // casting to 'int256' is safe because USDC balances are bounded well below int256 max
            // forge-lint: disable-start(unsafe-typecast)
            pnlBps =
                (int256(latestBalance) - int256(startBalance)) *
                10_000 /
                int256(startBalance);
            // forge-lint: disable-end(unsafe-typecast)
        }
    }

    /* ── LEADERBOARD VIEW ─────────────────────────────── */
    /**
     * @notice Get the full leaderboard: addresses, PnLs, and names.
     * @return addrs  Array of agent addresses.
     * @return pnls   Array of PnL values in basis points.
     * @return names  Array of agent names.
     */
    function getLeaderboard()
        external
        view
        returns (
            address[] memory addrs,
            int256[] memory pnls,
            string[] memory names
        )
    {
        uint256 len = agentList.length;
        addrs = new address[](len);
        pnls = new int256[](len);
        names = new string[](len);

        for (uint256 i; i < len; ) {
            address agent = agentList[i];
            addrs[i] = agent;
            names[i] = agents[agent].name;

            uint256 startBal = agents[agent].startingBalanceUSDC;
            PnLSnapshot[] storage history = snapshotHistory[agent];

            uint256 latestBal;
            if (history.length > 0) {
                latestBal = history[history.length - 1].balanceAtSnapshot;
            } else {
                latestBal = startBal;
            }

            if (startBal > 0) {
                // casting to 'int256' is safe because USDC balances are bounded well below int256 max
                // forge-lint: disable-start(unsafe-typecast)
                pnls[i] =
                    (int256(latestBal) - int256(startBal)) *
                    10_000 /
                    int256(startBal);
                // forge-lint: disable-end(unsafe-typecast)
            }

            unchecked {
                ++i;
            }
        }
    }

    /* ── SUBSCRIPTION FEE ROUTING ─────────────────────── */
    /**
     * @notice Route a subscription fee from subscriber to agent creator + treasury.
     * @dev    Only callable by the authorized payment relay.
     * @param  subscriber    The fee payer.
     * @param  agentAddress  The agent whose creator receives the fee.
     * @param  feeAmount     Total fee in USDC (6 decimals).
     */
    function routeSubscriptionFee(
        address subscriber,
        address agentAddress,
        uint256 feeAmount
    ) external nonReentrant {
        if (msg.sender != paymentRelayAddress) revert NotPaymentRelay();
        if (agents[agentAddress].registrationTime == 0)
            revert AgentNotRegistered();
        if (feeAmount == 0) revert ZeroAmount();

        // Calculate platform cut and creator cut
        uint256 platformCut = (feeAmount * platformFeeBps) / 10_000;
        uint256 creatorCut = feeAmount - platformCut;

        // Transfer from subscriber
        usdc.safeTransferFrom(subscriber, treasury, platformCut);
        usdc.safeTransferFrom(
            subscriber,
            agents[agentAddress].creatorWallet,
            creatorCut
        );

        agents[agentAddress].totalFeesCollected += feeAmount;

        emit SubscriptionFeeRouted(
            subscriber,
            agentAddress,
            feeAmount,
            platformCut,
            creatorCut
        );
    }

    /* ── ADMIN SETTERS ────────────────────────────────── */
    /**
     * @notice Set the payment relay address.
     */
    function setPaymentRelay(address _relay) external onlyOwner {
        if (_relay == address(0)) revert ZeroAddress();
        paymentRelayAddress = _relay;
    }

    /**
     * @notice Update the platform fee percentage.
     */
    function setPlatformFeeBps(uint256 _bps) external onlyOwner {
        platformFeeBps = _bps;
    }

    /**
     * @notice Deactivate an agent (remove from active roster).
     */
    function deactivateAgent(address agentAddress) external onlyOwner {
        if (agents[agentAddress].registrationTime == 0)
            revert AgentNotRegistered();
        agents[agentAddress].isActive = false;
        emit AgentDeactivated(agentAddress);
    }
}
