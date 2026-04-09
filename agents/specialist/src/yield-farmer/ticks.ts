import type { TickRange } from '../schemas/yield.js';
import { ValidationError } from '../shared/errors.js';

export function getTickSpacingForFee(feeTier: number): number {
  switch (feeTier) {
    case 100:
      return 1;
    case 500:
      return 10;
    case 3000:
      return 60;
    case 10000:
      return 200;
    default:
      throw new ValidationError('Unsupported fee tier', { feeTier });
  }
}

export function normalizeTickToSpacing(tick: number, spacing: number): number {
  return Math.floor(tick / spacing) * spacing;
}

function riskWidthMultiplier(riskProfile: 'conservative' | 'balanced' | 'aggressive'): number {
  if (riskProfile === 'conservative') return 1.8;
  if (riskProfile === 'aggressive') return 0.9;
  return 1.3;
}

export function computeTickRange(params: {
  referenceTick: number;
  volatilityBps: number;
  feeTier: 100 | 500 | 3000 | 10000;
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
}): TickRange {
  const spacing = getTickSpacingForFee(params.feeTier);
  const widthTicksRaw = Math.max(spacing * 4, Math.floor((params.volatilityBps / 10) * riskWidthMultiplier(params.riskProfile)));
  const width = Math.ceil(widthTicksRaw / spacing) * spacing;

  const center = normalizeTickToSpacing(params.referenceTick, spacing);
  const tickLower = normalizeTickToSpacing(center - width, spacing);
  const tickUpper = normalizeTickToSpacing(center + width, spacing);

  if (tickLower >= tickUpper) {
    throw new ValidationError('Invalid computed tick range', { params, tickLower, tickUpper });
  }

  return { tickLower, tickUpper, tickSpacing: spacing };
}
