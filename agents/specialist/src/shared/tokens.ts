import { ValidationError } from './errors.js';
import { CONTRACTS } from '../config/contracts.js';

export const TOKEN_MAP: Record<string, `0x${string}`> = {
  USDC: CONTRACTS.USDC,
  WETH: '0x4200000000000000000000000000000000000006',
  ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  BTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  OKB: '0x0000000000000000000000000000000000000001',
  UNI: '0x0000000000000000000000000000000000000002',
  LINK: '0x0000000000000000000000000000000000000003',
};

export function resolveTokenAddress(symbolOrAddress: string): `0x${string}` {
  const normalized = symbolOrAddress.toUpperCase();
  if (/^0x[a-fA-F0-9]{40}$/.test(symbolOrAddress)) {
    return symbolOrAddress as `0x${string}`;
  }

  const resolved = TOKEN_MAP[normalized];
  if (!resolved) {
    throw new ValidationError('Unsupported token symbol', { symbolOrAddress });
  }

  return resolved;
}
