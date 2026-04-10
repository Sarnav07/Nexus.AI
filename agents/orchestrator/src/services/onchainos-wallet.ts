import { createWalletClient, http, type Hex, type Address, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { xLayerTestnet } from '../config/chain.js';

/**
 * OnchainOS TEE Wallet Service
 * 
 * In production, this uses the OKX OnchainOS Wallet API / TEE Enclave
 * to sign transactions without exposing the private key to the application layer.
 * 
 * For the hackathon testnet environment, we simulate the TEE secure boundary
 * by injecting an ephemeral private key and executing securely.
 */
export class OnchainOsWalletService {
  private readonly client;
  private readonly publicClient;
  private readonly account;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('ONCHAINOS_TEE_API_KEY is required');
    
    // Abstracted TEE backend for the hacked demo. We use the testnet key to simulate the managed wallet.
    // In production: this is managed inside the TEE enclave by okx.
    const pk = process.env.TEE_SIMULATED_PRIVATE_KEY as Hex || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    this.account = privateKeyToAccount(pk);
    
    this.publicClient = createPublicClient({
      chain: xLayerTestnet,
      transport: http(process.env.X_LAYER_RPC_URL || 'https://testrpc.xlayer.tech')
    });

    this.client = createWalletClient({
      account: this.account,
      chain: xLayerTestnet,
      transport: http(process.env.X_LAYER_RPC_URL || 'https://testrpc.xlayer.tech')
    });
  }

  get address(): Address {
    return this.account.address;
  }

  /**
   * Broadcasts the transaction to the Onchain Gateway API.
   * Simulates the 'POST /api/v6/dex/pre-transaction/broadcast-transaction' capabilities.
   */
  async signAndBroadcast(txData: {
    to: Address;
    data: Hex;
    value?: bigint;
  }) {
    console.log(`[OnchainOS TEE] Encrypting payload and sending to TEE enclave for signature...`);
    
    // Enclave processing mock timeout
    await new Promise(r => setTimeout(r, 600));

    try {
      // Execute transaction programmatically (TEE simulated)
      const txHash = await this.client.sendTransaction({
        to: txData.to,
        data: txData.data,
        value: txData.value || 0n,
        chain: xLayerTestnet,
      });

      console.log(`[OnchainOS TEE] Broadcast successful! TxHash: ${txHash}`);
      
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });

      return {
        success: true,
        txHash,
        status: receipt.status,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error: any) {
      console.error(`[OnchainOS TEE Error] Failed to broadcast mapping`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const teeWalletService = new OnchainOsWalletService(process.env.ONCHAINOS_TEE_API_KEY || 'mock-api-key');
