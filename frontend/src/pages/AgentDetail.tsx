import { useParams, Link } from "react-router-dom";
import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import AmbientOrbs from "@/components/AmbientOrbs";
import GrainOverlay from "@/components/GrainOverlay";
import NumberTicker from "@/components/NumberTicker";
import { AgentLeaderboardABI, CONTRACTS, BLOCK_EXPLORER } from "@/lib/contracts";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
});

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-foreground/[0.06] ${className}`} />
);

const AgentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const agentAddress = id as `0x${string}`;

  // Read both agents(addr) and getAgentPnL(addr) together
  const { data, isLoading, isError } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.AgentLeaderboard,
        abi: AgentLeaderboardABI,
        functionName: 'agents',
        args: [agentAddress],
      },
      {
        address: CONTRACTS.AgentLeaderboard,
        abi: AgentLeaderboardABI,
        functionName: 'getAgentPnL',
        args: [agentAddress],
      },
    ],
  });

  const agentData = data?.[0].result;
  const pnlData = data?.[1].result;

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive font-mono">Failed to load agent data.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <GrainOverlay />
      <AmbientOrbs />
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-8 max-w-3xl mx-auto">
        <motion.div {...fadeUp(0)} className="mb-8">
          <Link to="/leaderboard" className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors">
            ← Back to Leaderboard
          </Link>
        </motion.div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="w-48 h-10" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        ) : !agentData ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-mono">Agent not found or unregistered.</p>
          </div>
        ) : (
          <motion.div {...fadeUp(0.1)} className="space-y-6">
            {/* Header Card */}
            <div className="bento-card p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6">
                <span className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-widest uppercase ${agentData[5] ? 'bg-neon-mint/10 text-neon-mint' : 'bg-destructive/10 text-destructive'}`}>
                  {agentData[5] ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h1 className="font-display text-3xl md:text-5xl text-foreground/90 mb-2">
                {agentData[1]}
              </h1>
              <a
                href={`${BLOCK_EXPLORER}/address/${agentAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
              >
                {agentAddress} ↗
              </a>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bento-card p-6">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Total PnL
                </p>
                <div className={`font-mono text-3xl mb-1 ${pnlData && Number(pnlData[0]) >= 0 ? "text-neon-mint" : "text-destructive/80"}`}>
                  <NumberTicker value={pnlData ? Number(pnlData[0]) / 100 : 0} suffix="%" />
                </div>
                <p className="text-xs font-mono text-muted-foreground">Basis Points: {pnlData ? Number(pnlData[0]) : 0}</p>
              </div>

              <div className="bento-card p-6">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Starting Balance
                </p>
                <div className="font-mono text-3xl text-foreground/90 mb-1">
                  $<NumberTicker value={Number(formatUnits(agentData[2] as bigint, 6))} />
                </div>
                <p className="text-xs font-mono text-muted-foreground">USDC</p>
              </div>

              <div className="bento-card p-6">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Current Balance
                </p>
                <div className="font-mono text-3xl text-foreground/90 mb-1">
                  $<NumberTicker value={pnlData ? Number(formatUnits(pnlData[2] as bigint, 6)) : 0} />
                </div>
                <p className="text-xs font-mono text-muted-foreground">USDC</p>
              </div>

              <div className="bento-card p-6">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Creator Wallet
                </p>
                <p className="font-mono text-sm text-foreground/80 mb-1 truncate">
                  {agentData[0]}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">Owner address</p>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default AgentDetail;
