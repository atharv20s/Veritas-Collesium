/**
 * ============================================================================
 * VERITAS FRONTIER — Vault SDK Client
 * ============================================================================
 * 
 * Interacts with the Sentinel Enclave Anchor program on Solana.
 * Facilitates vault initialization, deposits, and instruction introspection execution.
 */

import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { SentinelVault } from "../target/types/sentinel_enclave"; // Assuming generated IDL types

export const SENTINEL_PROGRAM_ID = new PublicKey("2SuD5N8dJ2zmdzvstQzZWjxvS39fptexTfEDDAoaVwJT");

export class SentinelVaultClient {
  private program: Program<any>;
  private provider: AnchorProvider;

  constructor(provider: AnchorProvider, idl: any) {
    this.provider = provider;
    this.program = new Program(idl, SENTINEL_PROGRAM_ID, provider);
  }

  /**
   * Derive the Vault PDA for a specific owner and enclave signer.
   */
  getVaultPDA(owner: PublicKey, enclaveSigner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("sentinel-vault"), owner.toBuffer(), enclaveSigner.toBuffer()],
      this.program.programId
    );
  }

  /**
   * Derive the aGDP Ledger PDA for a specific vault and agent.
   */
  getAgdpLedgerPDA(vault: PublicKey, agentId: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("agdp-ledger"), vault.toBuffer(), Buffer.from(agentId)],
      this.program.programId
    );
  }

  /**
   * Initialize a new Sentinel Vault.
   */
  async initializeVault(owner: Keypair, enclaveSigner: PublicKey, policyRoot: number[]): Promise<string> {
    const [vaultPDA] = this.getVaultPDA(owner.publicKey, enclaveSigner);

    const tx = await this.program.methods
      .initializeVault(policyRoot)
      .accounts({
        vault: vaultPDA,
        owner: owner.publicKey,
        enclaveSigner: enclaveSigner,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    console.log(`✅ Vault initialized. TX: ${tx}`);
    return tx;
  }

  /**
   * Initialize the aGDP Ledger for an Agent.
   */
  async initializeAgdpLedger(owner: Keypair, enclaveSigner: PublicKey, agentId: string): Promise<string> {
    const [vaultPDA] = this.getVaultPDA(owner.publicKey, enclaveSigner);
    const [ledgerPDA] = this.getAgdpLedgerPDA(vaultPDA, agentId);

    const tx = await this.program.methods
      .initializeAgdpLedger(agentId)
      .accounts({
        vault: vaultPDA,
        ledger: ledgerPDA,
        owner: owner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    console.log(`✅ aGDP Ledger initialized for ${agentId}. TX: ${tx}`);
    return tx;
  }

  /**
   * Log an aGDP event (INCOME/EXPENSE) to the on-chain ledger.
   */
  async logAgdpEvent(
    enclaveKeypair: Keypair,
    owner: PublicKey,
    agentId: string,
    eventType: "INCOME" | "EXPENSE",
    valueUsd: number,
    description: string
  ): Promise<string> {
    const [vaultPDA] = this.getVaultPDA(owner, enclaveKeypair.publicKey);
    const [ledgerPDA] = this.getAgdpLedgerPDA(vaultPDA, agentId);

    const tx = await this.program.methods
      .logAgdpEvent(eventType, new (require("bn.js"))(valueUsd * 1e6), description) // Convert to micro-dollars
      .accounts({
        vault: vaultPDA,
        ledger: ledgerPDA,
        enclaveSigner: enclaveKeypair.publicKey,
      })
      .signers([enclaveKeypair])
      .rpc();

    console.log(`📈 aGDP Event Logged: ${eventType} $${valueUsd}. TX: ${tx}`);
    return tx;
  }

  /**
   * Deposit SOL into the Vault.
   */
  async deposit(depositor: Keypair, owner: PublicKey, enclaveSigner: PublicKey, amountLamports: number): Promise<string> {
    const [vaultPDA] = this.getVaultPDA(owner, enclaveSigner);

    const tx = await this.program.methods
      .deposit(new (require("bn.js"))(amountLamports))
      .accounts({
        vault: vaultPDA,
        depositor: depositor.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([depositor])
      .rpc();

    console.log(`💰 Deposited ${amountLamports / 1e9} SOL. TX: ${tx}`);
    return tx;
  }

  /**
   * Validate a program via ACE Protocol.
   */
  async aceValidate(enclaveKeypair: Keypair, owner: PublicKey, targetProgram: PublicKey): Promise<string> {
    const [vaultPDA] = this.getVaultPDA(owner, enclaveKeypair.publicKey);

    const tx = await this.program.methods
      .aceValidate(targetProgram)
      .accounts({
        vault: vaultPDA,
        enclaveSigner: enclaveKeypair.publicKey,
      })
      .signers([enclaveKeypair])
      .rpc();

    console.log(`🛡️ ACE Validation TX: ${tx}`);
    return tx;
  }
}
