import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import Navbar from "@/components/Navbar";
import AmbientOrbs from "@/components/AmbientOrbs";
import GrainOverlay from "@/components/GrainOverlay";
import NumberTicker from "@/components/NumberTicker";
import VaultModal from "@/components/VaultModal";
import { useNexusVault } from "@/hooks/useNexusVault";
import { useAgentLeaderboard } from "@/hooks/useAgentLeaderboard";
import { useAppStore } from "@/store/appStore";

// ── Animation helpers ────────────────────────────────────────────────────────
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
});

// ── Skeleton loader — shape-matched to each card section ────────────────────
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-foreground/[0.06] ${className}`} />
);

// ── Bento card wrapper ───────────────────────────────────────────────────────
const BentoCard = ({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.div
    {...fadeUp(delay)}
    whileHover={{ scale: 1.005, boxShadow: "0 0 40px rgba(224,255,0,0.04)" }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
    className={`bento-card p-6 ${className}`}
  >
    {children}
  </motion.div>
);

// ── Format helpers ───────────────────────────────────────────────────────────
function fmtUSDC(val: string): number {
  return parseFloat(val) || 0;
}

function fmtDisplay(val: string, prefix = "$"): string {
  const n = parseFloat(val) || 0;
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(2)}K`;
  return `${prefix}${n.toFixed(2)}`;
}

// ── Main Component ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const [modalMode, setModalMode] = useState<"deposit" | "withdraw" | null>(null);
  const { address, isConnected } = useAccount();

  const vault = useNexusVault(isConnected ? address : undefined);
  const { topAgent, isLoading: leaderboardLoading } = useAgentLeaderboard();
  const isPaused = useAppStore((s) => s.riskParams?.isPaused ?? false);

  return (
    <div className="min-h-screen relative">
      <GrainOverlay />
      <AmbientOrbs />
      <Navbar />

      {/* ── Vault Paused Banner ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="fixed top-16 left-0 right-0 z-40 flex items-center justify-center px-4 py-2.5 bg-destructive/10 border-b border-destructive/20 backdrop-blur-sm"
            role="alert"
          >
            <p className="text-xs font-mono text-destructive/90">
              ⚠ Vault temporarily paused for user protection. Deposits and withdrawals are disabled.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-24 pb-12 px-4 sm:px-8 max-w-[1440px] mx-auto">
        <motion.div {...fadeUp(0)} className="mb-8">
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-primary mb-2">
            Portfolio Overview
          </p>
          <h1 className="font-display text-4xl sm:text-5xl text-foreground/90">
            Command Center
          </h1>
        </motion.div>

        {/* ── Row 1: Quick Actions + Portfolio Value ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Quick Actions */}
          <BentoCard className="flex flex-col gap-4" delay={0.05}>
            <p className="text-xs text-muted-foreground font-mono tracking-wider uppercase mb-1">
              Quick Actions
            </p>

            {/* Read-only gatekeeper: blur actions if not connected */}
            {!isConnected ? (
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <button
                    onClick={() => {}}
                    disabled
                    className="w-full py-4 bg-primary/30 text-primary-foreground/40 font-body text-sm font-semibold rounded-inner cursor-not-allowed"
                  >
                    Deposit
                  </button>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-mono text-foreground/40">Connect wallet to deposit</span>
                  </div>
                </div>
                <button
                  disabled
                  className="w-full py-4 border border-foreground/5 text-foreground/30 font-body text-sm rounded-inner cursor-not-allowed"
                >
                  Withdraw
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setModalMode("deposit")}
                  disabled={isPaused}
                  className="w-full py-4 bg-primary text-primary-foreground font-body text-sm font-semibold rounded-inner transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(224,255,0,0.4)] active:scale-[0.98] relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <span className="relative z-10">Deposit</span>
                  <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.08] to-transparent" />
                </button>
                <button
                  onClick={() => setModalMode("withdraw")}
                  disabled={isPaused}
                  className="w-full py-4 border border-foreground/10 text-foreground/80 font-body text-sm font-medium rounded-inner transition-all hover:bg-foreground/[0.05] hover:border-foreground/20 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Withdraw
                </button>
              </>
            )}

            <div className="mt-auto pt-4 border-t border-foreground/[0.04]">
              <p className="text-xs text-muted-foreground font-mono mb-2">Active Strategy</p>
              <div className="flex flex-wrap gap-2">
                {["Delta Neutral", "High Freq"].map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-foreground/60 bg-foreground/[0.05] border border-foreground/10 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </BentoCard>

          {/* Portfolio Value — spans 2 cols */}
          <BentoCard className="lg:col-span-2 flex flex-col" delay={0.1}>
            <p className="text-xs text-muted-foreground font-mono tracking-wider uppercase mb-2">
              {isConnected ? "Your Vault Balance" : "Platform Total Value Locked"}
            </p>

            {vault.isLoading ? (
              <div className="space-y-3 mb-4">
                <Skeleton className="h-16 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : !isConnected ? (
              /* Demo mode — show TVL */
              <div className="font-mono text-5xl sm:text-6xl lg:text-7xl font-semibold text-foreground/90 mb-4">
                <NumberTicker value={fmtUSDC(vault.totalDeposits)} prefix="$" />
              </div>
            ) : (
              /* Connected — show user balance */
              <div className="font-mono text-5xl sm:text-6xl lg:text-7xl font-semibold text-foreground/90 mb-4">
                <NumberTicker value={fmtUSDC(vault.userBalance)} prefix="$" />
              </div>
            )}

            {isConnected && !vault.isLoading && (
              <div className="flex gap-4 mb-4 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground">
                  High-Water Mark:{" "}
                  <span className="text-foreground/70">
                    {fmtDisplay(vault.highWaterMark)}
                  </span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  Platform TVL:{" "}
                  <span className="text-foreground/70">
                    {fmtDisplay(vault.totalDeposits)}
                  </span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  Max Drawdown:{" "}
                  <span className="text-foreground/70">
                    {(vault.maxDrawdownBps / 100).toFixed(0)}%
                  </span>
                </span>
              </div>
            )}

            {/* Sparkline chart */}
            <div className="relative flex-1 min-h-[120px] w-full rounded-inner overflow-hidden bg-foreground/[0.02]">
              <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(72 100% 50%)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="hsl(72 100% 50%)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,75 C40,70 60,55 100,50 C140,45 160,30 200,25 C240,20 260,35 300,20 C340,8 360,12 400,5 L400,100 L0,100 Z"
                  fill="url(#chartGrad)"
                />
                <path
                  d="M0,75 C40,70 60,55 100,50 C140,45 160,30 200,25 C240,20 260,35 300,20 C340,8 360,12 400,5"
                  fill="none"
                  stroke="hsl(72 100% 50%)"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
              </svg>
            </div>
          </BentoCard>
        </div>

        {/* ── Row 2: Agent Status + Recent Executions + Yield ─────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Agent Status — wired to leaderboard rank-1 */}
          <BentoCard delay={0.2}>
            <p className="text-xs text-muted-foreground font-mono tracking-wider uppercase mb-4">
              Top Agent
            </p>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 via-neon-violet/20 to-transparent animate-float" />
              <div className="absolute inset-2 rounded-full border border-primary/20 animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-4 rounded-full border border-neon-cyan/10 animate-[spin_15s_linear_infinite_reverse]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-primary/60 animate-pulse-glow" />
              </div>
            </div>

            {leaderboardLoading ? (
              <div className="text-center space-y-2">
                <Skeleton className="h-4 w-28 mx-auto" />
                <Skeleton className="h-3 w-20 mx-auto" />
              </div>
            ) : topAgent ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-neon-mint animate-pulse-glow" />
                  <span className="font-mono text-sm text-foreground/80">{topAgent.name}</span>
                </div>
                <span
                  className={`text-xs font-mono ${
                    topAgent.pnlBps >= 0 ? "text-neon-mint" : "text-destructive/70"
                  }`}
                >
                  {topAgent.pnlFormatted} PnL
                </span>
              </div>
            ) : (
              <div className="text-center">
                <span className="font-mono text-xs text-muted-foreground">No agents registered</span>
              </div>
            )}
          </BentoCard>

          {/* Recent Executions — placeholder (live feed in Phase 4 Activity page) */}
          <BentoCard className="lg:col-span-2" delay={0.25}>
            <p className="text-xs text-muted-foreground font-mono tracking-wider uppercase mb-4">
              Recent Executions
            </p>
            <div className="space-y-0">
              {[
                { action: "Swap WETH → USDC", amount: "+$4,891.22", time: "2m ago", positive: true },
                { action: "Yield Deposit (Aave)", amount: "-$2,000.00", time: "8m ago", positive: false },
                { action: "Swap USDT → WETH", amount: "+$3,210.50", time: "14m ago", positive: true },
                { action: "Rebalance Portfolio", amount: "$0.00", time: "22m ago", positive: true },
              ].map((tx, i) => (
                <div
                  key={i}
                  className="group flex items-center justify-between py-3 border-b border-foreground/[0.03] last:border-0 hover:bg-foreground/[0.02] transition-colors relative"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="pl-3">
                    <p className="text-sm text-foreground/80 font-body">{tx.action}</p>
                    <p className="text-xs text-muted-foreground font-mono">{tx.time}</p>
                  </div>
                  <span className={`font-mono text-sm ${tx.positive ? "text-neon-mint" : "text-muted-foreground"}`}>
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>

          {/* Vault Risk Params */}
          <BentoCard delay={0.3}>
            <p className="text-xs text-muted-foreground font-mono tracking-wider uppercase mb-4">
              Risk Parameters
            </p>

            {vault.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-24 mx-auto" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <p
                    className={`font-mono text-4xl font-semibold mb-1 ${
                      isPaused ? "text-destructive/70" : "text-neon-mint"
                    }`}
                  >
                    {isPaused ? "PAUSED" : `${(vault.maxDrawdownBps / 100).toFixed(0)}%`}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {isPaused ? "Vault is paused" : "Max Drawdown"}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Max Drawdown</span>
                    <span className="text-foreground/70">
                      {(vault.maxDrawdownBps / 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Max Position</span>
                    <span className="text-foreground/70">
                      {(vault.maxPositionSizeBps / 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Platform TVL</span>
                    <span className="text-foreground/70">{fmtDisplay(vault.totalDeposits)}</span>
                  </div>
                </div>
              </>
            )}
          </BentoCard>
        </div>
      </main>

      <VaultModal
        mode={modalMode || "deposit"}
        open={modalMode !== null}
        onClose={() => setModalMode(null)}
      />
    </div>
  );
};

export default Dashboard;
