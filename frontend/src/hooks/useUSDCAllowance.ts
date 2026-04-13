import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { ERC20_ABI, CONTRACTS } from '@/lib/contracts';

/**
 * useUSDCAllowance
 * Reads the current USDC allowance the user has granted to NexusVault.
 * Used in VaultModal to determine whether Step 1 (approve) can be skipped.
 * USDC = 6 decimals.
 */
export function useUSDCAllowance(userAddress?: `0x${string}`) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress
      ? [userAddress, CONTRACTS.NexusVault]
      : undefined,
    query: { enabled: !!userAddress },
  });

  const rawAllowance = data as bigint | undefined;

  return {
    /** Raw bigint allowance (use for comparisons with parseUnits) */
    rawAllowance: rawAllowance ?? 0n,
    /** Human-readable formatted allowance (6 decimals) */
    allowance: rawAllowance !== undefined ? formatUnits(rawAllowance, 6) : '0',
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * useUSDCBalance
 * Reads the user's raw USDC wallet balance (not vault balance).
 * Used in VaultModal to show the "Max" deposit amount.
 */
export function useUSDCBalance(userAddress?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  const raw = data as bigint | undefined;

  return {
    rawBalance: raw ?? 0n,
    balance: raw !== undefined ? formatUnits(raw, 6) : '0',
    isLoading,
    refetch,
  };
}
