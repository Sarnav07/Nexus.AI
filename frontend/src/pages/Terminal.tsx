import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import AmbientOrbs from "@/components/AmbientOrbs";
import GrainOverlay from "@/components/GrainOverlay";
import TerminalView from "@/components/TerminalView";

const Terminal = () => {
  return (
    <div className="min-h-screen relative">
      <GrainOverlay />
      <AmbientOrbs />
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-8 max-w-[1440px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-primary mb-2">
            Proof of Action
          </p>
          <h1 className="font-display text-4xl sm:text-5xl text-foreground/90">
            Agent Terminal
          </h1>
          <p className="mt-3 text-sm text-muted-foreground font-body max-w-lg">
            Real-time execution log from autonomous agents. Every trade, every
            risk check, every on-chain confirmation — fully transparent.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="h-[calc(100vh-280px)] min-h-[400px]"
        >
          <TerminalView />
        </motion.div>
      </main>
    </div>
  );
};

export default Terminal;
