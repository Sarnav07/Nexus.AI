import { useQuery } from '@tanstack/react-query';
import { useReadContract } from 'wagmi';
import { ORCHESTRATOR_URL, AgentLeaderboardABI, CONTRACTS } from '@/lib/contracts';

export interface LeaderboardAgent {
  address: `0x${string}`;
  name: string;
  /** PnL in basis points (int256 → number). 100 bps = 1% */
  pnlBps: number;
  /** Formatted PnL string e.g. "+12.40%" */
  pnlFormatted: string;
  rank: number;
}

function formatPnl(bps: number): string {
  const pct = bps / 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

/**
 * useAgentLeaderboard
 * Primary: fetches from Orchestrator /api/leaderboard (TanStack Query, 30s refresh).
 * Fallback: if API is down, reads directly from AgentLeaderboard contract.
 */
export function useAgentLeaderboard() {
  // ── Primary: Orchestrator API ──────────────────────────────────────────────
  const apiQuery = useQuery<LeaderboardAgent[]>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/leaderboard`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Orchestrator returns: { agents: [{ address, name, pnlBps }] }
      const agents: Array<{ address: string; name: string; pnlBps: number }> =
        Array.isArray(data) ? data : (data.agents ?? []);

      return agents.map((a, i) => ({
        address: a.address as `0x${string}`,
        name: a.name,
        pnlBps: Number(a.pnlBps ?? 0),
        pnlFormatted: formatPnl(Number(a.pnlBps ?? 0)),
        rank: i + 1,
      }));
    },
    refetchInterval: 30_000,
    retry: 1,
    staleTime: 15_000,
  });

  // ── Fallback: on-chain read ─────────────────────────────────────────────────
  const onChainQuery = useReadContract({
    address: CONTRACTS.AgentLeaderboard,
    abi: AgentLeaderboardABI,
    functionName: 'getLeaderboard',
    query: {
      enabled: apiQuery.isError, // only activate when API fails
      refetchInterval: 60_000,
    },
  });

  const onChainData = onChainQuery.data as
    | readonly [readonly `0x${string}`[], readonly bigint[], readonly string[]]
    | undefined;

  const fallbackAgents: LeaderboardAgent[] = onChainData
    ? onChainData[0].map((addr, i) => ({
        address: addr,
        name: onChainData[2][i] ?? `Agent ${i + 1}`,
        pnlBps: Number(onChainData[1][i]),
        pnlFormatted: formatPnl(Number(onChainData[1][i])),
        rank: i + 1,
      }))
    : [];

  const isUsingFallback = apiQuery.isError;
  const agents = isUsingFallback ? fallbackAgents : (apiQuery.data ?? []);
  const topAgent = agents[0] ?? null;

  return {
    agents,
    topAgent,
    isLoading: apiQuery.isLoading || (isUsingFallback && onChainQuery.isLoading),
    isUsingFallback,
    error: isUsingFallback ? (onChainQuery.error as Error | null) : null,
    refetch: () => apiQuery.refetch(),
  };
}
