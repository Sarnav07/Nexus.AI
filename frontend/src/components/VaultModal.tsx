import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { NexusVaultABI, ERC20_ABI, CONTRACTS } from "@/lib/contracts";
import { useUSDCAllowance, useUSDCBalance } from "@/hooks/useUSDCAllowance";
import { useNexusVault } from "@/hooks/useNexusVault";

type ModalMode = "deposit" | "withdraw";

interface VaultModalProps {
  mode: ModalMode;
  open: boolean;
  onClose: () => void;
}

// ── Only USDC is supported by NexusVault ────────────────────────────────────
const TOKEN = { symbol: "USDC", decimals: 6, icon: "💲" };

// ── Tx status helper ─────────────────────────────────────────────────────────
type TxStatus = "idle" | "approving" | "approved" | "pending" | "success" | "error";

const VaultModal = ({ mode, open, onClose }: VaultModalProps) => {
  const { address } = useAccount();
  const isDeposit = mode === "deposit";

  // ── Local UI state ────────────────────────────────────────────────────────
  const [amount, setAmount] = useState("");
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txError, setTxError] = useState<string | null>(null);

  // ── On-chain read state ───────────────────────────────────────────────────
  const { rawAllowance, refetch: refetchAllowance } = useUSDCAllowance(address);
  const { rawBalance, balance: walletBalance, refetch: refetchBalance } = useUSDCBalance(address);
  const { userBalance: vaultBalance, refetch: refetchVault } = useNexusVault(address);

  // ── Write contracts ───────────────────────────────────────────────────────
  const {
    writeContract,
    data: writeTxHash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  // ── Wait for tx confirmation ──────────────────────────────────────────────
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: writeTxHash,
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const parsedAmount = parseFloat(amount) || 0;
  const amountBigInt = amount ? parseUnits(amount, TOKEN.decimals) : 0n;

  // For deposit: check if current allowance covers the amount
  const needsApproval = isDeposit && amountBigInt > 0n && rawAllowance < amountBigInt;

  // Step 1 = approve needed, Step 2 = ready to deposit/withdraw
  const step: 1 | 2 = isDeposit && needsApproval ? 1 : 2;

  // Max amount: wallet balance for deposit, vault balance for withdraw
  const maxAmount = isDeposit ? walletBalance : vaultBalance;

  // ── Sync write errors ─────────────────────────────────────────────────────
  useEffect(() => {
    if (writeError) {
      const msg = writeError.message;
      setTxError(
        msg.includes("rejected") || msg.includes("denied")
          ? "Transaction rejected. Please approve in MetaMask."
          : msg.length > 100
          ? msg.slice(0, 100) + "…"
          : msg
      );
      setTxStatus("error");
    }
  }, [writeError]);

  // ── Handle confirmation ───────────────────────────────────────────────────
  useEffect(() => {
    if (isConfirmed) {
      setTxStatus("success");
      // Refetch all relevant data
      refetchAllowance();
      refetchBalance();
      refetchVault();
    }
  }, [isConfirmed, refetchAllowance, refetchBalance, refetchVault]);

  // ── Reset on open/close ───────────────────────────────────────────────────
  const handleClose = () => {
    onClose();
    setAmount("");
    setTxStatus("idle");
    setTxError(null);
    resetWrite();
  };

  // ── Step 1: Approve USDC ──────────────────────────────────────────────────
  const handleApprove = () => {
    if (!address || amountBigInt === 0n) return;
    setTxError(null);
    setTxStatus("approving");
    writeContract({
      address: CONTRACTS.USDC,
      abi: ERC20_ABI,
      functionName: "approve" as const,
      args: [CONTRACTS.NexusVault, amountBigInt],
    } as unknown as Parameters<typeof writeContract>[0]);
  };

  // ── Step 2: Deposit or Withdraw ───────────────────────────────────────────
  const handleExecute = () => {
    if (!address || amountBigInt === 0n) return;
    setTxError(null);
    setTxStatus("pending");

    if (isDeposit) {
      writeContract({
        address: CONTRACTS.NexusVault,
        abi: NexusVaultABI,
        functionName: "deposit" as const,
        args: [amountBigInt],
      } as unknown as Parameters<typeof writeContract>[0]);
    } else {
      writeContract({
        address: CONTRACTS.NexusVault,
        abi: NexusVaultABI,
        functionName: "withdraw" as const,
        args: [amountBigInt],
      } as unknown as Parameters<typeof writeContract>[0]);
    }
  };

  // ── Amount input validation ───────────────────────────────────────────────
  const handleAmountChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > TOKEN.decimals) return;
    setAmount(cleaned);
    // Reset tx state when amount changes
    if (txStatus !== "idle") { setTxStatus("idle"); setTxError(null); resetWrite(); }
  };

  const isProcessing = isWritePending || isConfirming;

  // ── Success screen ────────────────────────────────────────────────────────
  if (txStatus === "success") {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4"
            onClick={handleClose}
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bento-card p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                className="w-16 h-16 rounded-full bg-neon-mint/10 border border-neon-mint/30 flex items-center justify-center mx-auto mb-4"
              >
                <span className="text-2xl">✓</span>
              </motion.div>
              <h2 className="font-display text-2xl text-foreground/90 mb-2">
                {isDeposit ? "Deposit Confirmed" : "Withdrawal Confirmed"}
              </h2>
              <p className="text-sm font-mono text-muted-foreground mb-2">
                {amount} {TOKEN.symbol} {isDeposit ? "deposited to" : "withdrawn from"} Nexus Vault
              </p>
              {writeTxHash && (
                <a
                  href={`https://www.oklink.com/xlayer-test/tx/${writeTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-primary/70 hover:text-primary transition-colors"
                >
                  View on Explorer ↗
                </a>
              )}
              <button
                onClick={handleClose}
                className="mt-6 w-full py-3 bg-primary text-primary-foreground font-body text-sm font-semibold rounded-inner hover:scale-[1.01] transition-all"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // ── Main modal ────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bento-card p-0 overflow-hidden"
          >
            {/* Ambient glow */}
            <div
              className="absolute -top-32 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
              style={{
                background: isDeposit
                  ? "radial-gradient(circle, rgba(224,255,0,0.08) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(255,51,102,0.06) 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />

            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 flex items-center justify-between border-b border-foreground/[0.04]">
              <div>
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">
                  {isDeposit ? "Deposit to Vault" : "Withdraw from Vault"}
                </p>
                <h2 className="font-display text-2xl text-foreground/90">
                  {isDeposit ? "Fund Your Agent" : "Reclaim Capital"}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="w-9 h-9 flex items-center justify-center rounded-inner border border-foreground/10 text-muted-foreground hover:text-foreground/80 hover:bg-foreground/[0.05] transition-all"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="relative px-6 py-5 space-y-5">
              {/* Token (USDC only) */}
              <div className="flex items-center gap-2 py-2.5 px-3 rounded-inner bg-primary/[0.06] border border-primary/20">
                <span>{TOKEN.icon}</span>
                <span className="text-xs font-mono text-primary tracking-wider">{TOKEN.symbol}</span>
                <span className="text-[10px] font-mono text-muted-foreground ml-auto">
                  NexusVault only accepts USDC
                </span>
              </div>

              {/* Amount input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                    Amount
                  </p>
                  <button
                    onClick={() => setAmount(maxAmount.replace(/,/g, ""))}
                    className="text-[10px] font-mono text-primary/80 hover:text-primary tracking-wider uppercase transition-colors"
                  >
                    Max: {parseFloat(maxAmount).toFixed(2)} {TOKEN.symbol}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    disabled={isProcessing}
                    className="w-full bg-foreground/[0.03] border border-foreground/[0.06] rounded-inner px-5 py-4 font-mono text-3xl text-foreground/90 placeholder:text-foreground/20 focus:outline-none focus:border-primary/30 focus:shadow-[0_0_16px_rgba(224,255,0,0.06)] transition-all disabled:opacity-50"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-mono text-muted-foreground">
                    {TOKEN.symbol}
                  </span>
                </div>
                {parsedAmount > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-mono text-muted-foreground mt-2 pl-1"
                  >
                    ≈ ${parsedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
                  </motion.p>
                )}
              </div>

              {/* Error banner */}
              <AnimatePresence>
                {txError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="px-4 py-3 rounded-inner bg-destructive/10 border border-destructive/20 text-xs font-mono text-destructive/80"
                  >
                    {txError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Network info */}
              <div className="flex items-center justify-between py-3 px-4 rounded-inner bg-foreground/[0.02] border border-foreground/[0.04]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-neon-mint animate-pulse-glow" />
                  <span className="text-[11px] font-mono text-muted-foreground">X Layer Testnet</span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Est. gas: ~0.0004 OKB
                </span>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="relative px-6 pb-6 pt-2">
              {/* Approve step (deposit only, when allowance insufficient) */}
              {isDeposit && needsApproval ? (
                <button
                  onClick={handleApprove}
                  disabled={parsedAmount <= 0 || isProcessing}
                  className={`w-full py-4 rounded-inner font-body text-sm font-semibold transition-all relative overflow-hidden ${
                    parsedAmount <= 0
                      ? "bg-foreground/[0.06] text-muted-foreground cursor-not-allowed"
                      : isProcessing
                      ? "border border-primary/30 text-primary bg-transparent"
                      : "bg-primary text-primary-foreground hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(224,255,0,0.35)] active:scale-[0.98]"
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-3">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="inline-block w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full"
                      />
                      {isConfirming ? "Confirming on-chain…" : "Approve in MetaMask…"}
                    </span>
                  ) : (
                    <span className="relative z-10">1. Approve USDC</span>
                  )}
                  {parsedAmount > 0 && !isProcessing && (
                    <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.08] to-transparent" />
                  )}
                </button>
              ) : (
                /* Execute: deposit or withdraw */
                <motion.button
                  initial={isDeposit ? { opacity: 0, y: 6 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleExecute}
                  disabled={parsedAmount <= 0 || isProcessing}
                  className={`w-full py-4 rounded-inner font-body text-sm font-semibold transition-all relative overflow-hidden ${
                    parsedAmount <= 0
                      ? "bg-foreground/[0.06] text-muted-foreground cursor-not-allowed"
                      : isProcessing
                      ? "border border-primary/30 text-primary bg-transparent"
                      : isDeposit
                      ? "bg-primary text-primary-foreground hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(224,255,0,0.35)] active:scale-[0.98]"
                      : "bg-destructive/80 text-foreground hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(255,51,102,0.3)] active:scale-[0.98]"
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-3">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="inline-block w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full"
                      />
                      {isConfirming ? "Confirming on-chain…" : "Confirm in MetaMask…"}
                    </span>
                  ) : (
                    <span className="relative z-10">
                      {isDeposit ? "2. " : ""}
                      {isDeposit ? "Deposit" : "Withdraw"} {amount || "0"} {TOKEN.symbol}
                    </span>
                  )}
                  {parsedAmount > 0 && !isProcessing && (
                    <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.08] to-transparent" />
                  )}
                </motion.button>
              )}

              {/* Step indicator (deposit only) */}
              {isDeposit && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  <div className={`w-6 h-0.5 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-foreground/10"}`} />
                  <div className={`w-6 h-0.5 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-foreground/10"}`} />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VaultModal;
