import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import AmbientOrbs from "@/components/AmbientOrbs";
import GrainOverlay from "@/components/GrainOverlay";
import { useSignalFeed } from "@/hooks/useSignalFeed";
import { BLOCK_EXPLORER } from "@/lib/contracts";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
});

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-foreground/[0.06] ${className}`} />
);

const Activity = () => {
  const { signals, isLoading, totalCount, shortAddr, refetch } = useSignalFeed(50); // Get more signals for the dedicated page

  return (
    <div className="min-h-screen relative">
      <GrainOverlay />
      <AmbientOrbs />
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-8 max-w-[1440px] mx-auto">
        <motion.div {...fadeUp(0)} className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.25em] uppercase text-primary mb-2">
              On-chain Executions
            </p>
            <h1 className="font-display text-4xl sm:text-5xl text-foreground/90 mb-3">
              Activity Feed
            </h1>
            <p className="text-sm text-muted-foreground font-body max-w-lg">
              Live stream of all agent trades and risk checks.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-inner bg-foreground/[0.03] border border-foreground/[0.06]">
              <div className="w-1.5 h-1.5 rounded-full bg-neon-mint animate-pulse-glow" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Live
              </span>
            </div>
            <button
              onClick={() => refetch()}
              className="text-xs font-mono text-primary/70 hover:text-primary transition-colors"
            >
              Refresh ⟳
            </button>
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.1)} className="bento-card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/[0.04]">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Recent Signals
            </p>
            {!isLoading && (
              <span className="text-[10px] font-mono text-foreground/40">
                {totalCount} total events
              </span>
            )}
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            {isLoading ? (
              <div className="divide-y divide-foreground/[0.03]">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-6 px-5 py-4 min-w-[800px]">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-32 shrink-0" />
                    <Skeleton className="h-4 w-48 shrink-0" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="w-16 h-4 shrink-0" />
                  </div>
                ))}
              </div>
            ) : signals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 px-8 text-center">
                <div className="w-16 h-16 rounded-full bg-foreground/[0.04] border border-foreground/[0.06] flex items-center justify-center mb-6">
                  <span className="text-2xl">📡</span>
                </div>
                <p className="text-base font-body text-foreground/80 mb-2">Awaiting first signal</p>
                <p className="text-sm font-mono text-muted-foreground/60 max-w-sm">
                  Agent execution logs will appear here in real-time once trades are dispatched.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-foreground/[0.04] bg-foreground/[0.01]">
                    {["Event Type", "Agent", "Token Swap", "Amount", "Time", "Transaction"].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-[10px] font-mono text-muted-foreground uppercase tracking-wider"
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
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      className="group hover:bg-foreground/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-foreground/[0.03] border border-foreground/[0.06] font-mono text-sm font-bold ${sig.color}`}>
                            {sig.icon}
                          </div>
                          <span className={`text-xs font-mono ${sig.color}`}>
                            {sig.label}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <a
                          href={`${BLOCK_EXPLORER}/address/${sig.agentAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-foreground/70 hover:text-primary transition-colors flex items-center gap-2"
                        >
                          {shortAddr(sig.agentAddress)}
                          <span className="opacity-0 group-hover:opacity-100 text-[10px]">↗</span>
                        </a>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="text-foreground/80 px-2 py-1 rounded bg-foreground/[0.04]">
                            {shortAddr(sig.tokenIn)}
                          </span>
                          <span className="text-muted-foreground/40">→</span>
                          <span className="text-foreground/80 px-2 py-1 rounded bg-foreground/[0.04]">
                            {shortAddr(sig.tokenOut)}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-foreground/90 bg-foreground/[0.03] px-2 py-1 rounded">
                          {parseFloat(sig.amountIn).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-[11px] font-mono text-muted-foreground bg-foreground/[0.02] px-2 py-1 rounded">
                          {sig.timeAgo}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {sig.txHash ? (
                          <a
                            href={`${BLOCK_EXPLORER}/tx/${sig.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-mono text-primary/60 hover:text-primary transition-colors inline-block px-2 py-1"
                          >
                            {sig.txHash.slice(0, 10)}… ↗
                          </a>
                        ) : (
                          <span className="text-[11px] font-mono text-muted-foreground/30">—</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Activity;
