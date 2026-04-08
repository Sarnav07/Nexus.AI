// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/* ── IMPORTS ──────────────────────────────────────────── */
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  SignalRegistry
 * @notice Hyper-gas-optimised event log. Agents call this BEFORE executing
 *         any trade to publish their intended action on-chain. Gas cost is
 *         minimal — NO storage writes beyond a single counter.
 */
contract SignalRegistry is Ownable {
    /* ── CUSTOM ERRORS ────────────────────────────────── */
    error NotAuthorizedAgent();
    error EmptySignalData();

    /* ── THE SIGNAL EVENT ─────────────────────────────── */
    event SignalLogged(
        address indexed agentAddress,
        bytes32 indexed signalType,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        int24 tickLower,
        int24 tickUpper,
        uint256 timestamp
    );

    /* ── STRUCTS ──────────────────────────────────────── */
    struct SignalParams {
        bytes32 signalType;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        int24 tickLower;
        int24 tickUpper;
    }

    /* ── STATE VARIABLES ──────────────────────────────── */
    mapping(address => bool) public authorizedAgents;
    uint256 public totalSignalsLogged;

    /* ── SIGNAL TYPE CONSTANTS ────────────────────────── */
    bytes32 public constant SIG_UNISWAP_ADD_LIQ =
        keccak256(abi.encodePacked("UNISWAP_V3_ADD_LIQUIDITY"));
    bytes32 public constant SIG_UNISWAP_REMOVE_LIQ =
        keccak256(abi.encodePacked("UNISWAP_V3_REMOVE_LIQUIDITY"));
    bytes32 public constant SIG_MARKET_BUY =
        keccak256(abi.encodePacked("MARKET_BUY"));
    bytes32 public constant SIG_MARKET_SELL =
        keccak256(abi.encodePacked("MARKET_SELL"));

    /* ── CONSTRUCTOR ──────────────────────────────────── */
    constructor() Ownable(msg.sender) {
        // Initialize to 1 to avoid cold SSTORE (0→non-zero) penalty on first signal.
        // Actual count = totalSignalsLogged - 1
        totalSignalsLogged = 1;
    }

    /* ── MODIFIERS ────────────────────────────────────── */
    modifier onlyAuthorized() {
        if (!authorizedAgents[msg.sender]) revert NotAuthorizedAgent();
        _;
    }

    /* ── LOG SIGNAL ───────────────────────────────────── */
    /**
     * @notice Log a single trading signal on-chain.
     * @param  signalType  The type of signal (use constants above).
     * @param  tokenIn     The input token address.
     * @param  tokenOut    The output token address.
     * @param  amountIn    The input amount.
     * @param  tickLower   Lower tick (for LP ranges).
     * @param  tickUpper   Upper tick (for LP ranges).
     */
    function logSignal(
        bytes32 signalType,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        int24 tickLower,
        int24 tickUpper
    ) external onlyAuthorized {
        totalSignalsLogged++;

        emit SignalLogged(
            msg.sender,
            signalType,
            tokenIn,
            tokenOut,
            amountIn,
            tickLower,
            tickUpper,
            block.timestamp
        );
    }

    /* ── BATCH LOG ────────────────────────────────────── */
    /**
     * @notice Log multiple trading signals in a single transaction.
     * @param  signals  Array of SignalParams structs.
     */
    function logSignalBatch(
        SignalParams[] calldata signals
    ) external onlyAuthorized {
        uint256 len = signals.length;
        if (len == 0) revert EmptySignalData();

        totalSignalsLogged += len;

        for (uint256 i; i < len; ) {
            emit SignalLogged(
                msg.sender,
                signals[i].signalType,
                signals[i].tokenIn,
                signals[i].tokenOut,
                signals[i].amountIn,
                signals[i].tickLower,
                signals[i].tickUpper,
                block.timestamp
            );
            unchecked {
                ++i;
            }
        }
    }

    /* ── ADMIN ────────────────────────────────────────── */
    /**
     * @notice Authorize or revoke an agent for signal logging.
     */
    function setAgentAuthorization(
        address agent,
        bool status
    ) external onlyOwner {
        authorizedAgents[agent] = status;
    }
}
