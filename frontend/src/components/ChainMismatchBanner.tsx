import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwitchChain, useAccount } from 'wagmi';
import { SUPPORTED_CHAIN_ID, xLayerTestnet } from '@/lib/wagmi-config';

/**
 * useRawChainId
 * Reads the current chain ID directly from window.ethereum, bypassing wagmi's
 * config-aware chain resolution. This fires even when the user switches to a
 * chain that is NOT in our wagmi config (e.g. Ethereum mainnet), where
 * useAccount().isConnected drops to false and chainId becomes undefined.
 */
function useRawChainId() {
  const [rawChainId, setRawChainId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;

    // Read initial chain
    eth.request({ method: 'eth_chainId' }).then((hex: string) => {
      setRawChainId(parseInt(hex, 16));
    }).catch(() => {});

    // Subscribe to chain switches (fires for ANY network, not just wagmi ones)
    const handleChange = (hex: string) => setRawChainId(parseInt(hex, 16));
    eth.on('chainChanged', handleChange);
    return () => eth.removeListener('chainChanged', handleChange);
  }, []);

  return rawChainId;
}

const ChainMismatchBanner = () => {
  const { address } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();
  const [switchError, setSwitchError] = useState<string | null>(null);

  // Use raw provider chain ID — reliable even when wagmi marks connection as unsupported
  const rawChainId = useRawChainId();

  // Show banner when: wallet is actually connected (has address) AND on wrong chain
  const isWrongChain = !!address && rawChainId !== undefined && rawChainId !== SUPPORTED_CHAIN_ID;

  return (
    <AnimatePresence>
      {isWrongChain && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-16 left-0 right-0 z-40 flex items-center justify-center px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-sm"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 max-w-[1440px] w-full">
            <div className="flex-shrink-0 w-5 h-5 rounded-full border border-amber-400/60 flex items-center justify-center">
              <span className="text-amber-400 text-[10px] font-bold leading-none">!</span>
            </div>

            <p className="text-xs font-mono text-amber-300/90 flex-1">
              Wrong network detected ({rawChainId}). Please switch to{' '}
              <span className="text-amber-300 font-semibold">{xLayerTestnet.name}</span>{' '}
              to use Nexus.AI.
            </p>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setSwitchError(null);
                  try {
                    // First try to switch to the chain
                    await switchChain({ chainId: SUPPORTED_CHAIN_ID });
                  } catch (switchErr: any) {
                    // If switch fails, try to add the network first
                    try {
                      const eth = (window as any).ethereum;
                      if (eth) {
                        await eth.request({
                          method: 'wallet_addEthereumChain',
                          params: [{
                            chainId: `0x${SUPPORTED_CHAIN_ID.toString(16)}`,
                            chainName: xLayerTestnet.name,
                            nativeCurrency: xLayerTestnet.nativeCurrency,
                            rpcUrls: xLayerTestnet.rpcUrls.default.http,
                            blockExplorerUrls: [xLayerTestnet.blockExplorers?.default?.url],
                          }],
                        });
                        // After adding, try switching again
                        await switchChain({ chainId: SUPPORTED_CHAIN_ID });
                      } else {
                        throw new Error('No Ethereum provider found');
                      }
                    } catch (addErr: any) {
                      setSwitchError(addErr.message || switchErr.message || 'Failed to switch/add network');
                    }
                  }
                }}
                disabled={isPending}
                className="flex-shrink-0 px-3 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-900 bg-amber-400/90 hover:bg-amber-400 rounded-inner transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Switching...' : 'Add/Switch Network'}
              </button>

              <button
                onClick={() => window.location.reload()}
                className="flex-shrink-0 px-3 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-900 bg-amber-400/60 hover:bg-amber-400/80 rounded-inner transition-all"
              >
                Refresh
              </button>
            </div>

            {switchError && (
              <p className="text-xs text-red-400 ml-2">{switchError}</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChainMismatchBanner;
