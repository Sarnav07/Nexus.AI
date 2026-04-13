import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConnect, useAccount } from "wagmi";

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * WalletModal
 * A fully self-contained wallet connection dialog.
 * Lists every available connector wagmi detects (MetaMask, Injected, etc.),
 * shows loading state while connecting, and surfaces errors clearly.
 */
const WalletModal = ({ open, onClose }: WalletModalProps) => {
  const { isConnected } = useAccount();
  const { connect, connectors, isPending, error, reset } = useConnect();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Close automatically once wallet is connected
  useEffect(() => {
    if (isConnected && open) {
      onClose();
    }
  }, [isConnected, open, onClose]);

  // Reset error state when modal closes
  useEffect(() => {
    if (!open) {
      setConnectingId(null);
      reset();
    }
  }, [open, reset]);

  const handleConnect = (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (!connector) return;
    setConnectingId(connectorId);
    connect(
      { connector },
      {
        onError: () => setConnectingId(null),
        onSuccess: () => setConnectingId(null),
      }
    );
  };

  // With only injected() in config, there's exactly one connector.
  // Relabel it based on what window.ethereum says it is.
  const uniqueConnectors = connectors
    .map((c) => {
      if (c.name === "Injected" || c.name === "MetaMask") {
        const providerName =
          typeof window !== "undefined" && (window as any).ethereum?.isMetaMask
            ? "MetaMask"
            : typeof window !== "undefined" && (window as any).ethereum?.isOKExWallet
            ? "OKX Wallet"
            : typeof window !== "undefined" && (window as any).ethereum?.isRabby
            ? "Rabby"
            : typeof window !== "undefined" && (window as any).ethereum?.isCoinbaseWallet
            ? "Coinbase Wallet"
            : "Browser Wallet";
        return { ...c, displayName: providerName };
      }
      return { ...c, displayName: c.name };
    })
    // Deduplicate — keep first connector with each displayName
    .filter((c, idx, arr) => arr.findIndex((x) => x.displayName === c.displayName) === idx);

  const getConnectorIcon = (name: string) => {
    if (name.toLowerCase().includes("metamask")) return "🦊";
    if (name.toLowerCase().includes("coinbase")) return "🔵";
    if (name.toLowerCase().includes("okx")) return "⭕";
    if (name.toLowerCase().includes("rabby")) return "🐰";
    return "💼";
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bento-card p-0 overflow-hidden"
          >
            {/* Ambient glow */}
            <div
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(224,255,0,0.06) 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />

            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 flex items-center justify-between border-b border-foreground/[0.04]">
              <div>
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">
                  Web3 Connection
                </p>
                <h2 className="font-display text-2xl text-foreground/90">Connect Wallet</h2>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-inner border border-foreground/10 text-muted-foreground hover:text-foreground/80 hover:bg-foreground/[0.05] transition-all"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="relative px-6 py-5 space-y-3">
              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="px-4 py-3 rounded-inner bg-destructive/10 border border-destructive/20 text-xs font-mono text-destructive/80"
                  >
                    {error.message.includes("rejected")
                      ? "Connection rejected. Please approve in your wallet."
                      : error.message.length > 80
                      ? error.message.slice(0, 80) + "…"
                      : error.message}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* No wallets detected */}
              {uniqueConnectors.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground font-body mb-2">
                    No wallet extension detected.
                  </p>
                  <a
                    href="https://metamask.io/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-primary hover:underline"
                  >
                    Install MetaMask →
                  </a>
                </div>
              )}

              {/* Connector list */}
              {uniqueConnectors.map((connector) => {
                const isThisConnecting = connectingId === connector.id;
                return (
                  <button
                    key={connector.id}
                    onClick={() => handleConnect(connector.id)}
                    disabled={isPending}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-inner border transition-all ${
                      isThisConnecting
                        ? "border-primary/40 bg-primary/5"
                        : "border-foreground/[0.06] bg-foreground/[0.02] hover:bg-foreground/[0.05] hover:border-foreground/10"
                    } disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getConnectorIcon(connector.displayName)}</span>
                      <div className="text-left">
                        <p className="text-sm font-body font-medium text-foreground/90">
                          {connector.displayName}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground">
                          {isThisConnecting ? "Check your wallet…" : "Click to connect"}
                        </p>
                      </div>
                    </div>
                    {isThisConnecting ? (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="inline-block w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full"
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">→</span>
                    )}
                  </button>
                );
              })}

              <p className="text-[10px] font-mono text-muted-foreground/60 text-center pt-1">
                X Layer Testnet · Chain ID 195
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WalletModal;
