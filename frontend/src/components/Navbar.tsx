import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useDisconnect } from "wagmi";
import { useAppStore } from "@/store/appStore";
import { SUPPORTED_CHAIN_ID } from "@/lib/wagmi-config";
import WalletModal from "./WalletModal";

// Direct provider listener — fires for ANY chain switch, even unsupported chains
function useRawChainId() {
  const [rawChainId, setRawChainId] = useState<number | undefined>(undefined);
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    eth.request({ method: 'eth_chainId' }).then((hex: string) => {
      setRawChainId(parseInt(hex, 16));
    }).catch(() => {});
    const handle = (hex: string) => setRawChainId(parseInt(hex, 16));
    eth.on('chainChanged', handle);
    return () => eth.removeListener('chainChanged', handle);
  }, []);
  return rawChainId;
}

const NAV_ITEMS = [
  { label: "Dashboard",   path: "/dashboard" },
  { label: "Terminal",    path: "/terminal" },
  { label: "Leaderboard", path: "/leaderboard" },
  { label: "Activity",    path: "/activity" },
];

const statusColors: Record<string, string> = {
  online:   "bg-neon-mint",
  degraded: "bg-amber-400",
  offline:  "bg-destructive/70",
};

const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const Navbar = () => {
  const { pathname } = useLocation();
  const orchestratorStatus = useAppStore((s) => s.orchestratorStatus);
  const dotColor = statusColors[orchestratorStatus] ?? "bg-muted-foreground";

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const rawChainId = useRawChainId();
  // Use raw provider chainId — isConnected drops false on unsupported chains in wagmi v2
  const isWrongChain = !!address && rawChainId !== undefined && rawChainId !== SUPPORTED_CHAIN_ID;

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Ref to the account pill button — used to position the portal dropdown
  const pillRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  // Recalculate dropdown position whenever it opens
  useEffect(() => {
    if (showDropdown && pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,            // 8px below the button
        right: window.innerWidth - rect.right, // align to right edge
      });
    }
  }, [showDropdown]);

  // Close dropdown on outside click or scroll
  useEffect(() => {
    if (!showDropdown) return;
    const close = () => setShowDropdown(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [showDropdown]);

  // Close dropdown if wallet disconnects
  useEffect(() => {
    if (!isConnected) setShowDropdown(false);
  }, [isConnected]);

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-foreground/[0.04]"
      >
        <div className="max-w-[1440px] mx-auto px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            {/* Orchestrator status dot with visible hover tooltip */}
            <div className="relative group">
              <div
                className={`w-2 h-2 rounded-full ${dotColor} animate-pulse-glow transition-colors duration-700 cursor-default`}
              />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 rounded bg-foreground/10 border border-foreground/10 backdrop-blur-sm text-[10px] font-mono text-foreground/70 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[300]">
                Orchestrator: {orchestratorStatus}
              </div>
            </div>
            <span className="font-mono text-sm font-semibold tracking-widest uppercase text-foreground/90">
              Nexus.AI
            </span>
          </Link>


          {/* Nav + Wallet */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 text-sm font-body rounded-inner transition-colors ${
                  pathname === item.path
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground/90 hover:bg-foreground/[0.03]"
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* Wallet Area */}
            <div className="ml-4">
              {!isConnected ? (
                <button
                  id="connect-wallet-btn"
                  onClick={() => setWalletModalOpen(true)}
                  className="px-5 py-2 bg-primary text-primary-foreground font-body text-sm font-semibold rounded-inner transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(224,255,0,0.4)] active:scale-[0.98]"
                >
                  Connect Wallet
                </button>
              ) : isWrongChain ? (
                <button
                  onClick={() => setWalletModalOpen(true)}
                  className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-semibold rounded-inner transition-all hover:bg-amber-500/20"
                >
                  ⚠ Wrong Network
                </button>
              ) : (
                /* Connected — pill triggers portal dropdown */
                <button
                  ref={pillRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown((p) => !p);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-foreground/10 text-foreground/80 font-mono text-xs rounded-inner transition-all hover:bg-foreground/[0.05] hover:border-foreground/20"
                  aria-label="Wallet account menu"
                  aria-expanded={showDropdown}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-mint" />
                  <span>{shortAddr(address!)}</span>
                  <motion.span
                    animate={{ rotate: showDropdown ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-muted-foreground ml-0.5 text-[10px]"
                  >
                    ▾
                  </motion.span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ── Account Dropdown — rendered via portal to escape backdrop-filter stacking context ── */}
      {createPortal(
        <AnimatePresence>
          {showDropdown && isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{ position: "fixed", top: dropdownPos.top, right: dropdownPos.right }}
              className="w-56 bento-card p-2 z-[200]"
              role="menu"
            >
              <div className="px-3 py-2 border-b border-foreground/[0.05] mb-1">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">
                  Connected
                </p>
                <p className="text-xs font-mono text-foreground/70 break-all leading-relaxed">
                  {address}
                </p>
              </div>
              <button
                role="menuitem"
                onClick={() => { if (address) navigator.clipboard.writeText(address); setShowDropdown(false); }}
                className="w-full text-left px-3 py-2 text-xs font-body text-muted-foreground hover:text-foreground/90 hover:bg-foreground/[0.04] rounded-inner transition-colors"
              >
                Copy Address
              </button>
              <a
                role="menuitem"
                href={`https://www.oklink.com/xlayer-test/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowDropdown(false)}
                className="block w-full text-left px-3 py-2 text-xs font-body text-muted-foreground hover:text-foreground/90 hover:bg-foreground/[0.04] rounded-inner transition-colors"
              >
                View on Explorer ↗
              </a>
              <div className="border-t border-foreground/[0.05] mt-1 pt-1">
                <button
                  role="menuitem"
                  onClick={() => { disconnect(); setShowDropdown(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-body text-destructive/70 hover:text-destructive hover:bg-destructive/[0.05] rounded-inner transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Wallet Connection Modal */}
      <WalletModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
