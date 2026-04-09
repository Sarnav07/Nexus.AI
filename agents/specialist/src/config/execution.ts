export const EXECUTION_CONFIG = {
  chainId: 1952,
  defaultSlippageBps: Number(process.env.SPECIALIST_DEFAULT_SLIPPAGE_BPS || 50),
  defaultDeadlineSeconds: Number(process.env.SPECIALIST_DEFAULT_DEADLINE_SECONDS || 1200),
  uniswapV3Router: (process.env.UNISWAP_V3_ROUTER_ADDRESS || '0x0000000000000000000000000000000000000005') as `0x${string}`,
} as const;
