import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { ERC20_ABI, CONTRACTS } from '@/lib/contracts';

/**
 * useTokenAllowance
 * Reads the current token allowance the user has granted to NexusVault.
 * Generic version that works with any ERC20 token.
 */
export function useTokenAllowance(tokenAddress: `0x${string}`, decimals: number, userAddress?: `0x${string}`) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: tokenAddress,
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
    /** Human-readable formatted allowance */
    allowance: rawAllowance !== undefined ? formatUnits(rawAllowance, decimals) : '0',
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * useTokenBalance
 * Reads the user's raw token wallet balance.
 * Generic version that works with any ERC20 token.
 */
export function useTokenBalance(tokenAddress: `0x${string}`, decimals: number, userAddress?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  });

  const raw = data as bigint | undefined;

  return {
    rawBalance: raw ?? 0n,
    balance: raw !== undefined ? formatUnits(raw, decimals) : '0',
    isLoading,
    refetch,
  };
}

/**
 * useUSDCAllowance - Legacy function for backward compatibility
 * Reads the current USDC allowance the user has granted to NexusVault.
 */
export function useUSDCAllowance(userAddress?: `0x${string}`) {
  return useTokenAllowance(CONTRACTS.USDC, 6, userAddress);
}

/**
 * useUSDCBalance - Legacy function for backward compatibility
 * Reads the user's raw USDC wallet balance.
 */
export function useUSDCBalance(userAddress?: `0x${string}`) {
  return useTokenBalance(CONTRACTS.USDC, 6, userAddress);
}
