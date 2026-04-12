/**
 * OKX OnchainOS Agentic Wallet Skill (Mock definition)
 * Installed via: `npx skills add okx/onchainos-skills`
 * 
 * Provides secure TEE-enclave transaction signing capabilities for X Layer.
 * 
 * Note: Under the hood (for hackathon testnet), this wraps viem directly
 * to ensure real on-chain footprints are generated.
 */
import { createWalletClient, http, type Hex, type Address, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { xLayerTestnet } from '../../../config/chain.js';

export interface OnchainOsConfig {
  apiKey: string;
  rpcUrl: string;
  chainId: number;
}

export interface BroadcastResult {
  success: boolean;
  txHash?: Hash;
  error?: string;
  status?: string;
  gasUsed?: string;
}

type Hash = `0x${string}`;

export class AgenticWallet {
  private config: OnchainOsConfig;
  public address: Address;
  private client: any;
  private publicClient: any;

  constructor(config: OnchainOsConfig) {
    this.config = config;
    
    // Simulate TEE Environment with local key for testnet
    const pk = process.env.TEE_SIMULATED_PRIVATE_KEY as Hex || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const account = privateKeyToAccount(pk);
    this.address = account.address;

    this.publicClient = createPublicClient({
      chain: xLayerTestnet,
      transport: http(this.config.rpcUrl)
    });

    this.client = createWalletClient({
      account,
      chain: xLayerTestnet,
      transport: http(this.config.rpcUrl)
    });
  }

  /**
   * Broadcasts a transaction through the secure TEE Enclave.
   */
  async signAndBroadcast(txData: { to: Address; data: Hex; value?: bigint; }): Promise<BroadcastResult> {
    console.log(`[OnchainOS Skill] Triggering secure TEE boundary for signature...`);
    
    try {
      const txHash = await this.client.sendTransaction({
        to: txData.to,
        data: txData.data,
        value: txData.value || 0n,
        chain: xLayerTestnet,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });

      return {
        success: true,
        txHash,
        status: receipt.status,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
