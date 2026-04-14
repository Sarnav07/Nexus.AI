import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import AmbientOrbs from "@/components/AmbientOrbs";
import GrainOverlay from "@/components/GrainOverlay";
import NumberTicker from "@/components/NumberTicker";
import WalletModal from "@/components/WalletModal";
import { ORCHESTRATOR_URL } from "@/lib/contracts";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
});

const VaultDetail = () => {
  const { address, isConnected } = useAccount();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['vaultData', address],
    queryFn: async () => {
      if (!address) return null;
      const res = await fetch(`${ORCHESTRATOR_URL}/api/vault/${address}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: !!address,
  });

  if (!isConnected) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <GrainOverlay />
        <AmbientOrbs />
        <Navbar />
        <div className="text-center z-10">
          <p className="font-mono text-sm text-muted-foreground mb-4">Connect wallet to view vault details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <GrainOverlay />
      <AmbientOrbs />
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-8 max-w-4xl mx-auto">
        <motion.div {...fadeUp(0)} className="mb-10">
          <h1 className="font-display text-4xl sm:text-5xl text-foreground/90 mb-3">
            Your Vault Profile
          </h1>
          <p className="text-sm text-muted-foreground font-body max-w-lg">
            Detailed view of your deposits, platform TVL, and current risk parameters.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="animate-pulse flex flex-col gap-4">
            <div className="h-32 bg-foreground/[0.06] rounded-xl"></div>
            <div className="h-32 bg-foreground/[0.06] rounded-xl"></div>
          </div>
        ) : isError || !data ? (
          <div className="bento-card p-8 border-destructive/20 bg-destructive/5 text-center">
            <p className="font-mono text-sm text-destructive">Could not load vault data from the Orchestrator.</p>
          </div>
        ) : (
          <motion.div {...fadeUp(0.1)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bento-card p-6">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  Personal Balance
                </p>
                <div className="font-mono text-4xl text-neon-mint mb-1">
                  $<NumberTicker value={Number(data.balanceUSDC)} />
                </div>
                <p className="text-xs font-mono text-muted-foreground">USDC Deposited</p>
              </div>

              <div className="bento-card p-6">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                  High-Water Mark
                </p>
                <div className="font-mono text-3xl text-foreground/90 mb-1">
                  $<NumberTicker value={Number(data.highWaterMarkUSDC)} />
                </div>
                <p className="text-xs font-mono text-muted-foreground">Highest recorded balance</p>
              </div>
            </div>

            <div className="bento-card p-6 bg-foreground/[0.02]">
              <h2 className="font-mono text-sm uppercase tracking-wider text-foreground/80 mb-6">Global Statistics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Platform TVL</p>
                  <p className="text-xl font-mono text-foreground/90">${Number(data.totalDepositsUSDC).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Max Drawdown</p>
                  <p className="text-xl font-mono text-amber-400">{data.riskParams.maxDrawdownBps / 100}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Vault Status</p>
                  <p className="text-xl font-mono text-foreground/90">
                    {data.riskParams.isPaused ? (
                      <span className="text-destructive">Paused</span>
                    ) : (
                      <span className="text-neon-mint">Active</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default VaultDetail;
