import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import AmbientOrbs from "@/components/AmbientOrbs";
import GrainOverlay from "@/components/GrainOverlay";
import NumberTicker from "@/components/NumberTicker";
import { useAgentLeaderboard } from "@/hooks/useAgentLeaderboard";
import { useSignalFeed } from "@/hooks/useSignalFeed";
import { BLOCK_EXPLORER } from "@/lib/contracts";

// ── Animation ────────────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
});

// ── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-foreground/[0.06] ${className}`} />
);

// ── Rank medal ───────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return (
    <span className="font-mono text-sm text-muted-foreground w-6 text-center">
      #{rank}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const Leaderboard = () => {
  const { agents, isLoading: leaderboardLoading, isUsingFallback } = useAgentLeaderboard();
  const { signals, isLoading: signalsLoading, totalCount, shortAddr } = useSignalFeed(25);

  return (
    <div className="min-h-screen relative">
      <GrainOverlay />
      <AmbientOrbs />
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-8 max-w-[1440px] mx-auto">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div {...fadeUp(0)} className="mb-10">
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-primary mb-2">
            Proof of Performance
          </p>
          <h1 className="font-display text-4xl sm:text-5xl text-foreground/90 mb-3">
            Agent Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground font-body max-w-lg">
            Autonomous agents ranked by on-chain PnL. Every signal, every trade — fully verifiable.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ── Left: Agent Rankings ──────────────────────────────────────── */}
          <motion.div {...fadeUp(0.05)} className="xl:col-span-1">
            <div className="bento-card p-0 overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/[0.04]">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Agent Rankings
                </p>
                {isUsingFallback && (
                  <span className="text-[10px] font-mono text-amber-400/70 bg-amber-400/10 px-2 py-0.5 rounded">
                    On-chain
                  </span>
                )}
              </div>

              {/* Agent list */}
              <div className="divide-y divide-foreground/[0.03]">
                {leaderboardLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <Skeleton className="w-6 h-4" />
                      <Skeleton className="flex-1 h-4" />
                      <Skeleton className="w-16 h-4" />
                    </div>
                  ))
                ) : agents.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm font-mono text-muted-foreground">No agents registered yet</p>
                    <p className="text-xs font-mono text-muted-foreground/50 mt-1">
                      Deploy an agent to appear here
                    </p>
                  </div>
                ) : (
                  agents.map((agent, i) => (
                    <motion.div
                      key={agent.address}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      className="group flex items-center gap-4 px-5 py-4 hover:bg-foreground/[0.02] transition-colors relative"
                    >
                      {/* Active left accent for rank 1 */}
                      {agent.rank === 1 && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                      )}

                      <RankBadge rank={agent.rank} />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-medium text-foreground/90 truncate">
                          {agent.name}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground truncate">
                          {agent.address.slice(0, 10)}…{agent.address.slice(-6)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p
                          className={`font-mono text-sm font-semibold ${
                            agent.pnlBps >= 0 ? "text-neon-mint" : "text-destructive/80"
                          }`}
                        >
                          {agent.pnlFormatted}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground">PnL</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Summary footer */}
              {!leaderboardLoading && agents.length > 0 && (
                <div className="px-5 py-3 border-t border-foreground/[0.04] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {agents.length} agent{agents.length !== 1 ? "s" : ""} registered
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Best:{" "}
                    <span className="text-neon-mint">
                      {agents[0]?.pnlFormatted ?? "—"}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* ── Top Agent Highlight Card ───────────────────────────────── */}
            {!leaderboardLoading && agents[0] && (
              <motion.div {...fadeUp(0.15)} className="bento-card p-5 mt-4 relative overflow-hidden">
                <div
                  className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
                  style={{
                    background: "radial-gradient(circle, rgba(224,255,0,0.06) 0%, transparent 70%)",
                    filter: "blur(30px)",
                  }}
                />
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">
                  🥇 Rank 1 — Top Performer
                </p>
                <p className="font-display text-2xl text-foreground/90 mb-1">{agents[0].name}</p>
                <div className="font-mono text-4xl font-semibold text-neon-mint mb-1">
                  <NumberTicker value={agents[0].pnlBps / 100} suffix="%" />
                </div>
                <p className="text-xs font-mono text-muted-foreground">Overall PnL (basis points)</p>
                <a
                  href={`${BLOCK_EXPLORER}/address/${agents[0].address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-[11px] font-mono text-primary/60 hover:text-primary transition-colors"
                >
                  View on Explorer ↗
                </a>
              </motion.div>
            )}
          </motion.div>

          {/* ── Right: Signal Feed ──────────────────────────────────────────── */}
          <motion.div {...fadeUp(0.1)} className="xl:col-span-2">
            <div className="bento-card p-0 overflow-hidden h-full">
              {/* Feed header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/[0.04]">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Live Signal Feed
                  </p>
                  {!signalsLoading && (
                    <span className="text-[10px] font-mono text-foreground/40">
                      {totalCount} signals
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-mint animate-pulse-glow" />
                  <span className="text-[10px] font-mono text-muted-foreground">Live</span>
                </div>
              </div>

              {/* Feed content */}
              <div className="overflow-auto max-h-[calc(100vh-280px)] custom-scrollbar">
                {signalsLoading ? (
                  <div className="divide-y divide-foreground/[0.03]">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 px-5 py-4">
                        <Skeleton className="w-5 h-5 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="w-16 h-3" />
                      </div>
                    ))}
                  </div>
                ) : signals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-foreground/[0.04] border border-foreground/[0.06] flex items-center justify-center mb-4">
                      <span className="text-xl">📡</span>
                    </div>
                    <p className="text-sm font-mono text-muted-foreground mb-1">No signals yet</p>
                    <p className="text-xs font-mono text-muted-foreground/50">
                      Signals appear here when agents execute trades on-chain
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-foreground/[0.04]">
                        {["Type", "Agent", "Token In → Out", "Amount", "Time", "Tx"].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/[0.03]">
                      {signals.map((sig, i) => (
                        <motion.tr
                          key={sig.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="group hover:bg-foreground/[0.02] transition-colors"
                        >
                          {/* Signal type */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-sm font-bold ${sig.color}`}>
                                {sig.icon}
                              </span>
                              <span className={`text-xs font-mono ${sig.color}`}>
                                {sig.label}
                              </span>
                            </div>
                          </td>

                          {/* Agent address */}
                          <td className="px-5 py-3.5">
                            <a
                              href={`${BLOCK_EXPLORER}/address/${sig.agentAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono text-foreground/60 hover:text-primary transition-colors"
                            >
                              {shortAddr(sig.agentAddress)}
                            </a>
                          </td>

                          {/* Token flow */}
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-mono text-foreground/70">
                              {shortAddr(sig.tokenIn)}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground/50 mx-1.5">→</span>
                            <span className="text-xs font-mono text-foreground/70">
                              {shortAddr(sig.tokenOut)}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-mono text-foreground/70">
                              {parseFloat(sig.amountIn).toFixed(4)}
                            </span>
                          </td>

                          {/* Time */}
                          <td className="px-5 py-3.5">
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {sig.timeAgo}
                            </span>
                          </td>

                          {/* Tx link */}
                          <td className="px-5 py-3.5">
                            {sig.txHash ? (
                              <a
                                href={`${BLOCK_EXPLORER}/tx/${sig.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-mono text-primary/50 hover:text-primary transition-colors"
                              >
                                {sig.txHash.slice(0, 8)}↗
                              </a>
                            ) : (
                              <span className="text-[10px] font-mono text-muted-foreground/30">—</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
