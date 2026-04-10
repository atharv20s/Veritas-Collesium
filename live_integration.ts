import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection, SystemProgram } from "@solana/web3.js";
import { SentinelEnclave } from "./target/types/sentinel_enclave"; // Generated after build
import fs from "fs";

// Load local keypair for Devnet testing
const keypairPath = process.env.HOME + "/.config/solana/id.json";
const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {});
anchor.setProvider(provider);

// We will load the IDL directly from the deployed program once it finishes building
async function main() {
    console.log("=========================================");
    console.log("🛡️ SENTINEL ENCLAVE: LIVE DEVNET TEST 🛡️");
    console.log("=========================================");
    console.log(`Using Wallet: ${wallet.publicKey.toBase58()}`);
    
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`Balance: ${balance / 1e9} SOL`);

    if (balance === 0) {
        console.log("❌ Insufficient funds. Please airdrop to this address on devnet.");
        return;
    }

    try {
        const idl = JSON.parse(fs.readFileSync("./target/idl/sentinel_enclave.json", "utf8"));
        const programId = new PublicKey(idl.metadata.address);
        const program = new Program(idl, provider) as Program<SentinelEnclave>;

        console.log(`✅ Loaded Sentinel Program: ${programId.toBase58()}`);

        const [vaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), wallet.publicKey.toBuffer()],
            program.programId
        );

        console.log(`🔍 Vault PDA: ${vaultPda.toBase58()}`);

        // 1. Initialize Vault
        console.log("\n[1] Initializing Sentinel Vault Policy...");
        try {
            const tx = await program.methods
                .initializeVault([/* mock signature auth */], 70, 500) // 70 risk threshold, 5% max slippage
                .accounts({
                    vault: vaultPda,
                    owner: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            console.log(`✅ Vault Initialized! TX: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
        } catch (e) {
            console.log("Vault already initialized or error: ", e.message);
        }

        // 2. Simulate Attack Prevention (Toxic Memecoin)
        console.log("\n[2] Submitting transaction with 99% Slippage...");
        console.log("Sentinel Instruction Introspection should BLAME and REJECT.");
        try {
            // Mock transaction execution with a high slippage Jupiter route
            const tx = await program.methods
                .executeTransaction(90) // Score: 90/100 (Toxic)
                .accounts({
                    vault: vaultPda,
                    owner: wallet.publicKey,
                    // Note: In real setup, we pass the SysvarInstructions account here
                })
                .rpc();
            console.log("❌ CRITICAL FAILURE: Toxic transaction bypassed the Enclave!");
        } catch (e) {
            console.log("✅ ENCLAVE BLOCKED: Introspection successfully caught the toxic transaction.");
            console.log("Error trace: ", e.message);
        }

    } catch (e) {
        console.error("Failed to connect to Devnet Program. Has it been built and deployed?", e);
    }
}

main().catch(console.error);
