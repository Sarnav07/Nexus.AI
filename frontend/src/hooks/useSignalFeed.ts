import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { SignalRegistryABI, CONTRACTS, ORCHESTRATOR_URL } from '@/lib/contracts';
import { xLayerTestnet } from '@/lib/wagmi-config';

// ── Signal type map (bytes32 → human label) ──────────────────────────────────
const SIGNAL_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  '0x67d6f0e2d2fd5c97f25c97c9cec9f75e2e31a5bedb3f6e23d85b3ffc6cf57bc4': { label: 'Market Buy',         color: 'text-neon-mint',   icon: '↑' },
  '0xb6d5a1d44a1a0e7a547feefa9fef8ff8d71bb4e3fc7abc4c9e2ae03e2af5b0e0': { label: 'Market Sell',        color: 'text-destructive/80', icon: '↓' },
  '0x2da26e2c7e0eff6c15a73e6c228d3c2f7c2f74e8b1af5e5c8c3e8e2e1d6b7a9e': { label: 'Add Liquidity',     color: 'text-neon-cyan',   icon: '+' },
  '0x9f4c2c3a8b7e6d5f4e3c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1': { label: 'Remove Liquidity',  color: 'text-amber-400',   icon: '−' },
};

export interface SignalEvent {
  id: string;
  agentAddress: `0x${string}`;
  signalType: `0x${string}`;
  label: string;
  color: string;
  icon: string;
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: string;         // human-readable (18 dec assumed — adjust if needed)
  timestamp: number;
  blockNumber: bigint;
  txHash?: `0x${string}`;
  timeAgo: string;
}

function humanTimeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * useSignalFeed
 * Primary: GET /api/signals from Orchestrator (fast, cached).
 * Fallback: getLogs for SignalLogged event directly from the RPC.
 * Refreshes every 20 seconds.
 */
export function useSignalFeed(limit = 20) {
  const publicClient = usePublicClient({ chainId: xLayerTestnet.id });

  // ── Primary: Orchestrator API ─────────────────────────────────────────────
  const apiQuery = useQuery<SignalEvent[]>({
    queryKey: ['signals'],
    queryFn: async () => {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/signals?limit=${limit}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: SignalEvent[] = (Array.isArray(data) ? data : (data.signals ?? [])).map((s: any, i: number) => {
        const meta = SIGNAL_LABELS[s.signalType] ?? { label: 'Unknown', color: 'text-muted-foreground', icon: '?' };
        return {
          id: `api-${i}-${s.timestamp}`,
          agentAddress: s.agentAddress,
          signalType: s.signalType,
          ...meta,
          tokenIn: s.tokenIn,
          tokenOut: s.tokenOut,
          amountIn: s.amountIn ?? '0',
          timestamp: Number(s.timestamp),
          blockNumber: BigInt(s.blockNumber ?? 0),
          txHash: s.txHash,
          timeAgo: humanTimeAgo(Number(s.timestamp)),
        };
      });
      return items;
    },
    refetchInterval: 20_000,
    retry: 1,
    staleTime: 10_000,
  });

  // ── Fallback: on-chain getLogs ─────────────────────────────────────────────
  const onChainQuery = useQuery<SignalEvent[]>({
    queryKey: ['signals-onchain'],
    queryFn: async () => {
      if (!publicClient) return [];
      const logs = await publicClient.getLogs({
        address: CONTRACTS.SignalRegistry,
        event: {
          type: 'event',
          name: 'SignalLogged',
          inputs: [
            { name: 'agentAddress', type: 'address', indexed: true },
            { name: 'signalType',   type: 'bytes32', indexed: true },
            { name: 'tokenIn',      type: 'address', indexed: true },
            { name: 'tokenOut',     type: 'address', indexed: false },
            { name: 'amountIn',     type: 'uint256', indexed: false },
            { name: 'tickLower',    type: 'int24',   indexed: false },
            { name: 'tickUpper',    type: 'int24',   indexed: false },
            { name: 'timestamp',    type: 'uint256', indexed: false },
          ],
        } as any,
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      return logs
        .slice(-limit)
        .reverse()
        .map((log: any, i: number) => {
          const args = log.args ?? {};
          const ts = Number(args.timestamp ?? 0);
          const meta = SIGNAL_LABELS[args.signalType as string] ?? { label: 'Unknown', color: 'text-muted-foreground', icon: '?' };
          return {
            id: `chain-${log.blockNumber}-${i}`,
            agentAddress: args.agentAddress as `0x${string}`,
            signalType: args.signalType as `0x${string}`,
            ...meta,
            tokenIn: args.tokenIn as `0x${string}`,
            tokenOut: args.tokenOut as `0x${string}`,
            amountIn: formatUnits(args.amountIn as bigint ?? 0n, 18),
            timestamp: ts,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
            timeAgo: humanTimeAgo(ts),
          };
        });
    },
    enabled: apiQuery.isError, // only activate when API is down
    refetchInterval: 30_000,
  });

  const signals = apiQuery.isError ? (onChainQuery.data ?? []) : (apiQuery.data ?? []);

  return {
    signals,
    totalCount: signals.length,
    isLoading: apiQuery.isLoading || (apiQuery.isError && onChainQuery.isLoading),
    isUsingFallback: apiQuery.isError,
    shortAddr,
    refetch: () => apiQuery.refetch(),
  };
}
