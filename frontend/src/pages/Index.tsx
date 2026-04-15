import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import AmbientOrbs from "@/components/AmbientOrbs";
import GrainOverlay from "@/components/GrainOverlay";
import { useNexusVault } from "@/hooks/useNexusVault";
import { useAgentLeaderboard } from "@/hooks/useAgentLeaderboard";

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  }),
};

function fmtTVL(raw: string): string {
  const n = parseFloat(raw) || 0;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const Index = () => {
  const vault = useNexusVault(); // no address = global reads only
  const { agents, isLoading: leaderboardLoading } = useAgentLeaderboard();

  const stats = [
    {
      label: "Total Value Locked",
      value: vault.isLoading ? null : fmtTVL(vault.totalDeposits),
    },
    {
      label: "Active Agents",
      value: leaderboardLoading ? null : String(agents.length || 0),
    },
    {
      label: "Max Drawdown Cap",
      value: vault.isLoading ? null : `${(vault.maxDrawdownBps / 100).toFixed(0)}%`,
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <GrainOverlay />
      <AmbientOrbs />
      <Navbar />

      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div
          className="absolute w-[800px] h-[800px] rounded-full opacity-30"
          style={{
            background: "radial-gradient(circle, rgba(224,255,0,0.08) 0%, rgba(121,40,202,0.04) 40%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        <motion.div className="relative z-10 max-w-5xl mx-auto" initial="hidden" animate="visible">
          <motion.p custom={0} variants={fadeUp} className="font-mono text-xs tracking-[0.3em] uppercase text-primary mb-8">
            Decentralized Autonomous Execution
          </motion.p>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="font-display text-6xl sm:text-8xl lg:text-[110px] leading-[0.95] text-foreground/[0.92] mb-8"
          >
            The Autonomy
            <br />
            <em className="text-primary">of Capital.</em>
          </motion.h1>

          <motion.p custom={2} variants={fadeUp} className="max-w-[420px] mx-auto text-base text-muted-foreground leading-relaxed font-body mb-12">
            Nexus.AI is the first decentralized execution layer powered by
            autonomous agents. Deposit liquidity, set risk parameters, and let
            the matrix optimize your yield.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} className="flex items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="px-8 py-3.5 bg-primary text-primary-foreground font-body text-sm font-semibold rounded-inner transition-all hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(224,255,0,0.35)] active:scale-[0.98]"
            >
              Launch App
            </Link>
            <a
              href="#"
              className="px-8 py-3.5 border border-foreground/10 text-foreground/80 font-body text-sm rounded-inner transition-all hover:bg-foreground/[0.05] hover:border-foreground/20"
            >
              Read Docs
            </a>
          </motion.div>
        </motion.div>

        {/* Bottom stats bar — live on-chain data */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="absolute bottom-12 left-0 right-0 flex justify-center"
        >
          <div className="flex items-center gap-12 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                {stat.value === null ? (
                  <div className="animate-pulse h-7 w-20 rounded bg-foreground/[0.08] mx-auto mb-1" />
                ) : (
                  <p className="font-mono text-2xl font-semibold text-foreground/90">{stat.value}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1 tracking-wider uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default Index;
