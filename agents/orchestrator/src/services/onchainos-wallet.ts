import { type Hex, type Address } from 'viem';
import { AgenticWallet } from '../skills/okx/onchainos-skills/index.js';

/**
 * OnchainOS TEE Wallet Service
 * 
 * In production, this uses the OKX OnchainOS Wallet API / TEE Enclave
 * to sign transactions without exposing the private key to the application layer.
 */
export class OnchainOsWalletService {
  private wallet: AgenticWallet;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('ONCHAINOS_TEE_API_KEY is required');
    
    // We instantiate the skill directly. The skill internally manages the secure execution boundary.
    this.wallet = new AgenticWallet({
      apiKey: apiKey,
      rpcUrl: process.env.X_LAYER_RPC_URL || 'https://testrpc.xlayer.tech',
      chainId: 1952,
    });
  }

  get address(): Address {
    return this.wallet.address;
  }

  /**
   * Broadcasts the transaction to the Onchain Gateway API.
   */
  async signAndBroadcast(txData: {
    to: Address;
    data: Hex;
    value?: bigint;
  }) {
    // Delegate to the official OnchainOS Agentic Wallet Skill
    return await this.wallet.signAndBroadcast({
      to: txData.to,
      data: txData.data,
      value: txData.value
    });
  }
}

export const teeWalletService = new OnchainOsWalletService(process.env.ONCHAINOS_TEE_API_KEY || 'mock-api-key');
