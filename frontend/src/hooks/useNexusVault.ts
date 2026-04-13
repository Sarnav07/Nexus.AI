import { useReadContracts, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { NexusVaultABI, CONTRACTS } from '@/lib/contracts';
import { useAppStore } from '@/store/appStore';
import { useEffect } from 'react';

const VAULT = { address: CONTRACTS.NexusVault, abi: NexusVaultABI } as const;

export interface VaultData {
  /** User's USDC balance in the vault (human-readable, e.g. "1024.50") */
  userBalance: string;
  /** User's high-water mark — peak balance ever (human-readable) */
  highWaterMark: string;
  /** Total USDC deposited platform-wide (human-readable) */
  totalDeposits: string;
  /** Max drawdown ceiling in basis points (e.g. 1000 = 10%) */
  maxDrawdownBps: number;
  /** Max position size in basis points */
  maxPositionSizeBps: number;
  /** Whether the vault is paused */
  isPaused: boolean;
  /** True while any read is loading */
  isLoading: boolean;
  /** True if connected and data has loaded at least once */
  isLoaded: boolean;
  /** Error from the read, if any */
  error: Error | null;
  /** Manually refetch all data (call after a deposit/withdraw) */
  refetch: () => void;
}

const ZERO = '0.00';

/**
 * useNexusVault
 * Reads all relevant vault state for a given user address.
 * User-specific reads (balance, HWM) are skipped when no address is provided,
 * so the hook works in read-only/demo mode too.
 *
 * USDC uses 6 decimals — all internal values are formatted accordingly.
 */
export function useNexusVault(userAddress?: `0x${string}`): VaultData {
  const setRiskParams = useAppStore((s) => s.setRiskParams);

  // ── Global reads (always active) ────────────────────────────────────────
  const globalReads = useReadContracts({
    contracts: [
      { ...VAULT, functionName: 'totalDeposits' },
      { ...VAULT, functionName: 'getRiskParams' },
    ],
  });

  // ── User-specific reads (only when address is known) ─────────────────────
  const userBalance = useReadContract({
    ...VAULT,
    functionName: 'balances',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  const highWaterMark = useReadContract({
    ...VAULT,
    functionName: 'highWaterMark',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  // ── Parse results ─────────────────────────────────────────────────────────
  const [totalDepositsResult, riskParamsResult] = globalReads.data ?? [];

  const totalDepositsRaw = totalDepositsResult?.result as bigint | undefined;
  const riskParamsRaw = riskParamsResult?.result as
    | readonly [bigint, bigint, boolean]
    | undefined;

  const userBalanceRaw = userBalance.data as bigint | undefined;
  const hwmRaw = highWaterMark.data as bigint | undefined;

  const drawdownBps = riskParamsRaw ? Number(riskParamsRaw[0]) : 1000;
  const positionBps = riskParamsRaw ? Number(riskParamsRaw[1]) : 500;
  const isPaused    = riskParamsRaw ? riskParamsRaw[2] : false;

  // ── Sync risk params into Zustand so all components can read without re-querying ──
  useEffect(() => {
    if (riskParamsRaw) {
      setRiskParams({
        maxDrawdownBps: drawdownBps,
        maxPositionSizeBps: positionBps,
        isPaused,
      });
    }
  }, [drawdownBps, positionBps, isPaused, riskParamsRaw, setRiskParams]);

  const isLoading =
    globalReads.isLoading ||
    (!!userAddress && (userBalance.isLoading || highWaterMark.isLoading));

  const error =
    (globalReads.error as Error | null) ??
    (userBalance.error as Error | null) ??
    (highWaterMark.error as Error | null) ??
    null;

  const refetch = () => {
    globalReads.refetch();
    if (userAddress) {
      userBalance.refetch();
      highWaterMark.refetch();
    }
  };

  return {
    userBalance: userBalanceRaw !== undefined
      ? formatUnits(userBalanceRaw, 6)
      : ZERO,
    highWaterMark: hwmRaw !== undefined
      ? formatUnits(hwmRaw, 6)
      : ZERO,
    totalDeposits: totalDepositsRaw !== undefined
      ? formatUnits(totalDepositsRaw, 6)
      : ZERO,
    maxDrawdownBps: drawdownBps,
    maxPositionSizeBps: positionBps,
    isPaused,
    isLoading,
    isLoaded: !isLoading && !error,
    error,
    refetch,
  };
}
