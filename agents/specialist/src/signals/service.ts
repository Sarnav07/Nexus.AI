import { encodeFunctionData } from 'viem';
import { CONTRACTS, SIGNAL_TYPES, SignalRegistryABI } from '../config/contracts.js';
import {
  signalBatchPayloadOutputSchema,
  signalIntentSchema,
  signalPayloadOutputSchema,
  type SignalIntent,
} from '../schemas/signals.js';
import { nowUnix } from '../shared/time.js';

function toSignalHash(signalType: SignalIntent['signalType']) {
  return SIGNAL_TYPES[signalType];
}

export function buildLogSignalPayload(input: unknown) {
  const parsed = signalIntentSchema.parse(input);
  const signalTypeHash = toSignalHash(parsed.signalType);

  const data = encodeFunctionData({
    abi: SignalRegistryABI,
    functionName: 'logSignal',
    args: [
      signalTypeHash,
      parsed.tokenIn,
      parsed.tokenOut,
      BigInt(parsed.amountIn),
      parsed.tickLower,
      parsed.tickUpper,
    ],
  });

  return signalPayloadOutputSchema.parse({
    preTradeSignal: {
      signalType: parsed.signalType,
      signalTypeHash,
      tokenIn: parsed.tokenIn,
      tokenOut: parsed.tokenOut,
      amountIn: parsed.amountIn,
      tickLower: parsed.tickLower,
      tickUpper: parsed.tickUpper,
      timestamp: nowUnix(),
    },
    encodedCall: {
      target: CONTRACTS.SignalRegistry,
      data,
      value: '0',
    },
  });
}

export function buildLogSignalBatchPayload(inputs: unknown[]) {
  const parsed = inputs.map((input) => signalIntentSchema.parse(input));

  const args = parsed.map((item) => ({
    signalType: toSignalHash(item.signalType),
    tokenIn: item.tokenIn,
    tokenOut: item.tokenOut,
    amountIn: BigInt(item.amountIn),
    tickLower: item.tickLower,
    tickUpper: item.tickUpper,
  }));

  const data = encodeFunctionData({
    abi: SignalRegistryABI,
    functionName: 'logSignalBatch',
    args: [args],
  });

  return signalBatchPayloadOutputSchema.parse({
    signals: parsed.map((item) => ({
      signalType: item.signalType,
      signalTypeHash: toSignalHash(item.signalType),
      tokenIn: item.tokenIn,
      tokenOut: item.tokenOut,
      amountIn: item.amountIn,
      tickLower: item.tickLower,
      tickUpper: item.tickUpper,
      timestamp: nowUnix(),
    })),
    encodedCall: {
      target: CONTRACTS.SignalRegistry,
      data,
      value: '0',
    },
  });
}
