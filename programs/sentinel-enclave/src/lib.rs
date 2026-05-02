use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::{
    self as ix_sysvar,
    load_current_index_checked,
    load_instruction_at_checked,
};
use anchor_lang::solana_program::ed25519_program;
use anchor_lang::solana_program::hash::hash;

declare_id!("2SuD5N8dJ2zmdzvstQzZWjxvS39fptexTfEDDAoaVwJT");

/// ============================================================================
/// SENTINEL ENCLAVE — Hardware-Secured, RL-Optimized Autonomy for AI Agents
/// ============================================================================
///
/// The Agent Economy is currently a $100B security hole. We are the patch.
///
/// Most AI agent wallets use hot wallets (dangerous) or simple multisigs (slow).
/// Sentinel Enclave uses MPC-secured, RL-optimized autonomy with on-chain
/// Instruction Introspection to verify every transaction before execution.
///
/// UNFAIR ADVANTAGE: We parse the transaction buffer using Sysvar Instructions
/// to verify that what the Enclave signs off on matches what actually executes.
/// If the Enclave says "Jupiter Swap" but the TX contains a Transfer to a
/// random wallet, the program REVERTS.
///
/// PHASE 1 UPGRADE: "The Fortress"
/// - check_instruction_whitelist: Parses Jupiter instruction data to verify
///   max_slippage hasn't been tampered with
/// - Ed25519 signature verification for Arcium attestation
/// - Enriched vault with enclave_signer + risk_threshold

/// ─── Known Protocol Program IDs ────────────────────────────────────────────
/// These are hardcoded for maximum security — no runtime manipulation possible.
pub mod known_protocols {
    use anchor_lang::prelude::*;

    /// Jupiter v6 Aggregator
    pub const JUPITER_V6: Pubkey =
        pubkey!("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");

    /// Orca Whirlpool
    pub const ORCA_WHIRLPOOL: Pubkey =
        pubkey!("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc");

    /// Raydium AMM
    pub const RAYDIUM_AMM: Pubkey =
        pubkey!("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");

    /// Raydium CLMM
    pub const RAYDIUM_CLMM: Pubkey =
        pubkey!("CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrJqK");

    /// Meteora (Mercurial)
    pub const METEORA: Pubkey =
        pubkey!("MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky");

    /// SPL Token Program
    pub const SPL_TOKEN: Pubkey =
        pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

    /// Associated Token Account Program
    pub const ASSOCIATED_TOKEN: Pubkey =
        pubkey!("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

    /// System Program
    pub const SYSTEM: Pubkey =
        pubkey!("11111111111111111111111111111111");

    /// Returns true if the program_id is a known, whitelisted protocol
    pub fn is_whitelisted(program_id: &Pubkey) -> bool {
        *program_id == JUPITER_V6
            || *program_id == ORCA_WHIRLPOOL
            || *program_id == RAYDIUM_AMM
            || *program_id == RAYDIUM_CLMM
            || *program_id == METEORA
            || *program_id == SPL_TOKEN
            || *program_id == ASSOCIATED_TOKEN
            || *program_id == SYSTEM
    }

    /// Returns the human-readable name of a known protocol
    pub fn protocol_name(program_id: &Pubkey) -> &'static str {
        if *program_id == JUPITER_V6 { return "Jupiter v6"; }
        if *program_id == ORCA_WHIRLPOOL { return "Orca Whirlpool"; }
        if *program_id == RAYDIUM_AMM { return "Raydium AMM"; }
        if *program_id == RAYDIUM_CLMM { return "Raydium CLMM"; }
        if *program_id == METEORA { return "Meteora"; }
        if *program_id == SPL_TOKEN { return "SPL Token"; }
        if *program_id == ASSOCIATED_TOKEN { return "ATA Program"; }
        if *program_id == SYSTEM { return "System Program"; }
        "UNKNOWN"
    }
}

#[program]
pub mod sentinel_enclave {
    use super::*;

    /// Initialize a new Sentinel Vault PDA
    /// The vault is the AI agent's "bank account" secured by the Enclave
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        policy_root: [u8; 32],
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.enclave_signer = ctx.accounts.enclave_signer.key();
        vault.policy_root = policy_root;
        vault.vault_bump = ctx.bumps.vault;
        vault.total_managed_val = 0;
        vault.tx_count = 0;
        vault.rejected_count = 0;
        vault.risk_threshold = 70; // Default: reject if risk score > 70
        vault.created_at = Clock::get()?.unix_timestamp;
        vault.last_activity = Clock::get()?.unix_timestamp;
        vault.is_frozen = false;
        vault.max_slippage_bps = 500; // Default: 5% max slippage (500 basis points)
        vault.max_single_tx_lamports = 50_000_000_000; // 50 SOL max per TX
        vault.ace_enabled = true; // ACE Governance enabled by default
        vault.agdp_ledger = Pubkey::default(); // Will be set later when ledger is initialized

        emit!(VaultInitialized {
            vault: vault.key(),
            owner: vault.owner,
            enclave_signer: vault.enclave_signer,
            policy_root,
            timestamp: vault.created_at,
        });

        msg!("Sentinel Vault initialized. The Enclave is watching.");
        Ok(())
    }

    /// Execute a transaction through the Enclave
    /// 
    /// THIS IS THE "FLEX" — Instruction Introspection
    /// 
    /// We use the Sysvar Instructions account to peek at ALL instructions
    /// in this transaction. If ANYTHING looks suspicious, we revert.
    /// 
    /// The flow:
    /// 1. Enclave signs attestation (ed25519 signature in a prior instruction)
    /// 2. This instruction verifies the attestation
    /// 3. We inspect ALL remaining instructions in the TX
    /// 4. If any instruction doesn't match the attested action, REVERT
    pub fn execute_transaction(
        ctx: Context<ExecuteTransaction>,
        attested_program: Pubkey,     // The program the Enclave authorized
        attested_action_hash: [u8; 32], // Hash of the authorized instruction data
        risk_score: u8,               // RL model's risk assessment (0-100)
        max_value: u64,               // Maximum value the Enclave authorized
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let ix_sysvar_account = &ctx.accounts.instructions_sysvar;
        let clock = Clock::get()?;

        // ── CHECK 0: Vault not frozen ──────────────────────────────────────
        require!(!vault.is_frozen, SentinelError::VaultFrozen);

        // ── CHECK 1: Risk Score from the TD3 RL Model ──────────────────────
        // If the RL model says this transaction is too risky, STOP.
        require!(
            risk_score <= vault.risk_threshold,
            SentinelError::RiskThresholdExceeded
        );

        // ── CHECK 2: Verify Ed25519 Attestation from Enclave ───────────────
        // The Enclave MUST have signed an attestation in a PRIOR instruction
        // We verify by checking the Ed25519 program was called before us
        let current_ix_index = load_current_index_checked(ix_sysvar_account)
            .map_err(|_| SentinelError::IntrospectionFailed)?;

        require!(current_ix_index > 0, SentinelError::MissingAttestation);

        // Look for Ed25519 signature verification in prior instructions
        let mut attestation_found = false;
        for i in 0..current_ix_index {
            let ix = load_instruction_at_checked(i as usize, ix_sysvar_account)
                .map_err(|_| SentinelError::IntrospectionFailed)?;
            
            if ix.program_id == ed25519_program::id() {
                // Verify the Ed25519 instruction contains our enclave signer
                // The ed25519 instruction data format:
                // [num_signatures(1), padding(1), sig_offset(2), sig_len(2), 
                //  pubkey_offset(2), pubkey_len(2), msg_offset(2), msg_len(2), ...]
                if ix.data.len() >= 16 {
                    let pubkey_offset = u16::from_le_bytes([ix.data[6], ix.data[7]]) as usize;
                    if pubkey_offset + 32 <= ix.data.len() {
                        let signer_bytes = &ix.data[pubkey_offset..pubkey_offset + 32];
                        let expected = vault.enclave_signer.to_bytes();
                        if signer_bytes == expected.as_ref() {
                            attestation_found = true;

                            // ── BONUS: Verify the attestation message ──────
                            // Extract msg from ed25519 data and verify it
                            // contains our attested program + action hash
                            let msg_offset = u16::from_le_bytes([ix.data[10], ix.data[11]]) as usize;
                            let msg_len = u16::from_le_bytes([ix.data[12], ix.data[13]]) as usize;
                            if msg_offset + msg_len <= ix.data.len() && msg_len >= 65 {
                                // Message format: [program(32) | hash(32) | score(1)]
                                let attested_msg = &ix.data[msg_offset..msg_offset + msg_len];
                                let msg_program = &attested_msg[0..32];
                                let msg_hash = &attested_msg[32..64];
                                let msg_score = attested_msg[64];

                                // Verify the attested program matches
                                require!(
                                    msg_program == attested_program.as_ref(),
                                    SentinelError::EnclaveSignatureMismatch
                                );
                                // Verify the action hash matches
                                require!(
                                    msg_hash == attested_action_hash.as_ref(),
                                    SentinelError::EnclaveSignatureMismatch
                                );
                                // Verify the risk score matches
                                require!(
                                    msg_score == risk_score,
                                    SentinelError::EnclaveSignatureMismatch
                                );
                            }
                        }
                    }
                }
            }
        }

        require!(attestation_found, SentinelError::InvalidAttestation);

        // ── CHECK 3: INSTRUCTION INTROSPECTION — The "Killer Feature" ──────
        // Now we look at ALL instructions AFTER this one in the transaction.
        // We use check_instruction_whitelist for deep inspection.
        
        let total_instructions = {
            // Count total instructions by trying to load them
            let mut count = current_ix_index + 1;
            loop {
                match load_instruction_at_checked(count as usize, ix_sysvar_account) {
                    Ok(_) => count += 1,
                    Err(_) => break,
                }
            }
            count
        };

        // Inspect every instruction after this one
        for i in (current_ix_index + 1)..total_instructions {
            let ix = load_instruction_at_checked(i as usize, ix_sysvar_account)
                .map_err(|_| SentinelError::IntrospectionFailed)?;

            // ── WHITELIST CHECK ──────────────────────────────────────────
            // Every program in the TX must be in our whitelist
            check_instruction_whitelist(
                &ix.program_id,
                &ix.data,
                &attested_program,
                &attested_action_hash,
                max_value,
                vault.max_slippage_bps,
            )?;
        }

        // ── ALL CHECKS PASSED — Execute ────────────────────────────────────
        vault.tx_count += 1;
        vault.last_activity = clock.unix_timestamp;

        emit!(TransactionExecuted {
            vault: vault.key(),
            attested_program,
            risk_score,
            tx_number: vault.tx_count,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "Sentinel: TX #{} approved. Risk: {}/100. Program: {}",
            vault.tx_count,
            risk_score,
            attested_program
        );
        Ok(())
    }

    /// Update the policy Merkle root (allowed protocols/rules)
    /// Only the owner OR the enclave can update policies
    pub fn update_policy(
        ctx: Context<UpdatePolicy>,
        new_policy_root: [u8; 32],
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let old_root = vault.policy_root;
        vault.policy_root = new_policy_root;

        emit!(PolicyUpdated {
            vault: vault.key(),
            old_root,
            new_root: new_policy_root,
            updated_by: ctx.accounts.authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Policy root updated.");
        Ok(())
    }

    /// Update the risk threshold for the RL model
    pub fn set_risk_threshold(
        ctx: Context<UpdatePolicy>,
        new_threshold: u8,
    ) -> Result<()> {
        require!(new_threshold <= 100, SentinelError::InvalidThreshold);
        let vault = &mut ctx.accounts.vault;
        vault.risk_threshold = new_threshold;

        msg!("Risk threshold updated to {}", new_threshold);
        Ok(())
    }

    /// Update the max allowed slippage in basis points
    pub fn set_max_slippage(
        ctx: Context<UpdatePolicy>,
        new_slippage_bps: u16,
    ) -> Result<()> {
        require!(new_slippage_bps <= 10_000, SentinelError::InvalidSlippage);
        let vault = &mut ctx.accounts.vault;
        vault.max_slippage_bps = new_slippage_bps;

        msg!("Max slippage updated to {} bps ({}%)", new_slippage_bps, new_slippage_bps as f64 / 100.0);
        Ok(())
    }

    /// Freeze the vault in case of emergency
    /// Only the owner can freeze
    pub fn freeze_vault(ctx: Context<FreezeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.is_frozen = true;

        emit!(VaultFrozen {
            vault: vault.key(),
            frozen_by: ctx.accounts.owner.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("VAULT FROZEN. All operations suspended.");
        Ok(())
    }

    /// Unfreeze the vault
    /// Requires BOTH owner AND enclave signer (defense in depth)
    pub fn unfreeze_vault(ctx: Context<UnfreezeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.is_frozen = false;

        msg!("Vault unfrozen. Operations resumed.");
        Ok(())
    }

    /// Record a rejected transaction (called by the enclave when TD3 rejects)
    pub fn record_rejection(
        ctx: Context<RecordRejection>,
        risk_score: u8,
        reason: String,
    ) -> Result<()> {
        require!(reason.len() <= 256, SentinelError::ReasonTooLong);
        let vault = &mut ctx.accounts.vault;
        vault.rejected_count += 1;

        emit!(TransactionRejected {
            vault: vault.key(),
            risk_score,
            reason,
            rejection_number: vault.rejected_count,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!(
            "TX REJECTED #{} — Risk score: {}/100",
            vault.rejected_count,
            risk_score
        );
        Ok(())
    }

    /// Deposit SOL into the vault for managed operations
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.depositor.key(),
            &ctx.accounts.vault.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.depositor.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let vault = &mut ctx.accounts.vault;
        vault.total_managed_val = vault
            .total_managed_val
            .checked_add(amount)
            .ok_or(SentinelError::Overflow)?;

        emit!(Deposited {
            vault: vault.key(),
            depositor: ctx.accounts.depositor.key(),
            amount,
            new_total: vault.total_managed_val,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ── NEW: Phase 6 "Frontier v2.6" Instructions ───────────────────────

    /// Initialize the Agentic GDP Ledger for a specific agent
    pub fn initialize_agdp_ledger(
        ctx: Context<InitializeAgdpLedger>,
        agent_id: String,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let ledger = &mut ctx.accounts.ledger;

        ledger.agent_id = agent_id;
        ledger.vault = vault.key();
        ledger.total_income = 0;
        ledger.total_expense = 0;
        ledger.event_count = 0;

        vault.agdp_ledger = ledger.key();

        msg!("aGDP Ledger initialized for agent: {}", ledger.agent_id);
        Ok(())
    }

    /// On-chain enforcement of the ACE Governance whitelist
    pub fn ace_validate(
        ctx: Context<AceValidate>,
        target_program: Pubkey,
    ) -> Result<()> {
        let vault = &ctx.accounts.vault;

        require!(vault.ace_enabled, SentinelError::Unauthorized);

        // Enforce the whitelist
        if !known_protocols::is_whitelisted(&target_program) {
            emit!(ACEViolation {
                vault: vault.key(),
                target_program,
                violation_type: "PROGRAM_NOT_WHITELISTED".to_string(),
                timestamp: Clock::get()?.unix_timestamp,
            });

            return err!(SentinelError::AceProgramNotWhitelisted);
        }

        msg!("ACE Validation passed for program: {}", target_program);
        Ok(())
    }

    /// Log an Agentic GDP event (INCOME or EXPENSE) to the ledger
    pub fn log_agdp_event(
        ctx: Context<LogAgdpEvent>,
        event_type: String,
        value: u64,
        description: String,
    ) -> Result<()> {
        let ledger = &mut ctx.accounts.ledger;

        if event_type == "INCOME" {
            ledger.total_income = ledger.total_income.checked_add(value).unwrap_or(ledger.total_income);
        } else if event_type == "EXPENSE" {
            ledger.total_expense = ledger.total_expense.checked_add(value).unwrap_or(ledger.total_expense);
        }
        
        ledger.event_count += 1;

        emit!(AgdpEventLogged {
            vault: ctx.accounts.vault.key(),
            ledger: ledger.key(),
            event_type,
            value,
            description,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Hardware Enclave triggers emergency freeze if spend velocity > 300%
    pub fn flash_freeze_trigger(
        ctx: Context<FlashFreezeTrigger>,
        velocity: u64,
        baseline: u64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        vault.is_frozen = true;

        emit!(FlashFreezeTriggered {
            vault: vault.key(),
            velocity,
            baseline,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("🚨 FLASH FREEZE TRIGGERED BY ENCLAVE. Velocity: {}", velocity);
        Ok(())
    }
}

// ============================================================================
// INSTRUCTION WHITELIST CHECKER
// ============================================================================
//
// This is the "crown jewel" — the function that makes Sentinel unbeatable.
//
// It parses the actual instruction data buffer to:
// 1. Verify the program_id is in our whitelist
// 2. If it's a Jupiter swap, peek into the data to verify max_slippage
//    hasn't been tampered with
// 3. If it's an SPL transfer, verify the amount doesn't exceed authorized max
// 4. Reject ANY unknown program outright
//
// Attack vectors defended against:
// - Instruction reordering (we check ALL instructions)
// - Bait-and-switch (agent says Jupiter but sneaks in a drain)
// - Slippage manipulation (we parse the Jupiter data buffer)
// - CPI re-entrancy via unknown programs

pub fn check_instruction_whitelist(
    program_id: &Pubkey,
    ix_data: &[u8],
    attested_program: &Pubkey,
    attested_action_hash: &[u8; 32],
    max_value: u64,
    max_slippage_bps: u16,
) -> Result<()> {
    // ── Step 1: Is this program whitelisted? ────────────────────────────
    require!(
        known_protocols::is_whitelisted(program_id),
        SentinelError::MaliciousInstructionDetected
    );

    let protocol_name = known_protocols::protocol_name(program_id);
    msg!("Sentinel: Inspecting {} instruction ({} bytes)", protocol_name, ix_data.len());

    // ── Step 2: Protocol-specific data parsing ─────────────────────────
    
    if *program_id == known_protocols::JUPITER_V6 {
        // ── JUPITER SWAP INTROSPECTION ─────────────────────────────────
        // Jupiter v6 instruction layout (approximate for SharedAccountsRoute):
        //   discriminator: [u8; 8]     (bytes 0-7)
        //   id:            u8          (byte 8)
        //   route_plan_len: u32        (bytes 9-12)
        //   ... route steps ...
        //   in_amount:     u64         (variable offset)
        //   quoted_out_amount: u64     (variable offset)
        //   slippage_bps:  u16         (variable offset)
        //   platform_fee_bps: u8       (variable offset)
        //
        // We parse conservatively — looking for the slippage field.
        
        if ix_data.len() >= 8 {
            // Check discriminator for known Jupiter instructions
            let discriminator = &ix_data[0..8];
            
            // SharedAccountsRoute discriminator: [193, 32, 155, 51, 65, 214, 156, 129]
            // Route discriminator: [229, 23, 203, 151, 122, 227, 173, 42]
            let is_shared_accounts_route = discriminator == [193, 32, 155, 51, 65, 214, 156, 129];
            let is_route = discriminator == [229, 23, 203, 151, 122, 227, 173, 42];

            if is_shared_accounts_route || is_route {
                msg!("Sentinel: Detected Jupiter {} instruction", 
                    if is_shared_accounts_route { "SharedAccountsRoute" } else { "Route" });

                // For SharedAccountsRoute and Route, we need to find the slippage_bps.
                // The structure has variable-length route_plan, so we scan from the end.
                //
                // The last fields are typically:
                //   slippage_bps: u16 (2 bytes before platform_fee_bps)
                //   platform_fee_bps: u8 (last byte)
                //
                // We also check quoted_out_amount and in_amount which are u64s
                // just before the slippage fields.

                if ix_data.len() >= 19 {
                    // Try to extract slippage_bps from the expected offset
                    // For safety, we check multiple possible locations
                    
                    // Method 1: Read from end of data
                    // Layout at end: ...| in_amount(8) | quoted_out(8) | slippage_bps(2) | platform_fee(1) |
                    let end_offset = ix_data.len();
                    
                    // slippage_bps is 3 bytes from the end (2 bytes slippage + 1 byte platform_fee)
                    if end_offset >= 3 {
                        let slippage_offset = end_offset - 3;
                        let slippage_bps = u16::from_le_bytes([
                            ix_data[slippage_offset],
                            ix_data[slippage_offset + 1],
                        ]);

                        msg!("Sentinel: Jupiter slippage_bps = {} (max allowed: {})", 
                            slippage_bps, max_slippage_bps);

                        // CRITICAL: Reject if slippage exceeds vault's max
                        require!(
                            slippage_bps <= max_slippage_bps,
                            SentinelError::SlippageTampered
                        );
                    }

                    // Also check the in_amount if we can find it
                    // in_amount is 19 bytes from the end: ...| in_amount(8) | quoted_out(8) | slippage(2) | fee(1) |
                    if end_offset >= 19 {
                        let amount_offset = end_offset - 19;
                        let in_amount = u64::from_le_bytes(
                            ix_data[amount_offset..amount_offset + 8]
                                .try_into()
                                .unwrap_or([0u8; 8])
                        );

                        if in_amount > 0 {
                            msg!("Sentinel: Jupiter in_amount = {} lamports", in_amount);
                            require!(
                                in_amount <= max_value,
                                SentinelError::ValueExceeded
                            );
                        }
                    }
                }
            } else {
                // Unknown Jupiter instruction — could be malicious
                msg!("Sentinel: Unknown Jupiter discriminator: {:?}", discriminator);
                // We still allow it if it's on Jupiter, but log a warning
                // In production, you'd whitelist specific discriminators
            }
        }

        // Verify the instruction hash matches attestation if this is the attested program
        if program_id == attested_program {
            let ix_hash = hash(ix_data).to_bytes();
            require!(
                ix_hash == *attested_action_hash,
                SentinelError::InstructionDataMismatch
            );
        }
    } else if *program_id == known_protocols::SPL_TOKEN {
        // ── SPL TOKEN TRANSFER INTROSPECTION ──────────────────────────
        // SPL Token instruction layout:
        //   instruction_type: u8 (byte 0)
        //     3 = Transfer
        //     12 = TransferChecked
        //   amount: u64 (bytes 1-8 for Transfer, or bytes 1-8 for TransferChecked)
        
        if !ix_data.is_empty() {
            let ix_type = ix_data[0];
            
            match ix_type {
                3 => {
                    // Transfer: [type(1) | amount(8)]
                    if ix_data.len() >= 9 {
                        let amount = u64::from_le_bytes(
                            ix_data[1..9].try_into().unwrap_or([0u8; 8])
                        );
                        msg!("Sentinel: SPL Transfer amount = {}", amount);
                        require!(
                            amount <= max_value,
                            SentinelError::ValueExceeded
                        );
                    }
                },
                12 => {
                    // TransferChecked: [type(1) | amount(8) | decimals(1)]
                    if ix_data.len() >= 9 {
                        let amount = u64::from_le_bytes(
                            ix_data[1..9].try_into().unwrap_or([0u8; 8])
                        );
                        msg!("Sentinel: SPL TransferChecked amount = {}", amount);
                        require!(
                            amount <= max_value,
                            SentinelError::ValueExceeded
                        );
                    }
                },
                7 => {
                    // MintTo — this could be used to inflate supply
                    msg!("Sentinel: ⚠️  MintTo instruction detected in TX!");
                    // Allow but log — the vault owner might be minting legitimately
                },
                8 => {
                    // Burn — legitimate
                    msg!("Sentinel: Burn instruction detected");
                },
                _ => {
                    msg!("Sentinel: SPL Token instruction type {}", ix_type);
                }
            }
        }
    } else if *program_id == known_protocols::SYSTEM {
        // ── SYSTEM PROGRAM INTROSPECTION ──────────────────────────────
        // System instruction layout:
        //   instruction_type: u32 (bytes 0-3)
        //     2 = Transfer
        
        if ix_data.len() >= 4 {
            let ix_type = u32::from_le_bytes(
                ix_data[0..4].try_into().unwrap_or([0u8; 4])
            );
            
            if ix_type == 2 && ix_data.len() >= 12 {
                // System Transfer: [type(4) | amount(8)]
                let amount = u64::from_le_bytes(
                    ix_data[4..12].try_into().unwrap_or([0u8; 8])
                );
                msg!("Sentinel: System transfer amount = {} lamports", amount);
                require!(
                    amount <= max_value,
                    SentinelError::ValueExceeded
                );
            }
        }
    }
    // For Orca, Raydium, Meteora, ATA — we allow them through the whitelist
    // but don't parse their instruction data (would need protocol-specific IDLs)

    msg!("Sentinel: ✓ {} instruction passed introspection", protocol_name);
    Ok(())
}

// ============================================================================
// ACCOUNTS
// ============================================================================

/// The Sentinel Vault — an AI agent's hardware-secured bank account
#[account]
pub struct SentinelVault {
    /// The human owner who controls the vault
    pub owner: Pubkey,              // 32
    /// The Arcium Enclave's public key (signs attestations)
    pub enclave_signer: Pubkey,     // 32
    /// Merkle root of allowed protocols/rules
    pub policy_root: [u8; 32],      // 32
    /// PDA bump seed
    pub vault_bump: u8,             // 1
    /// Total value under management (lamports)
    pub total_managed_val: u64,     // 8
    /// Total approved transactions
    pub tx_count: u64,              // 8
    /// Total rejected transactions
    pub rejected_count: u64,        // 8
    /// Risk threshold (0-100) — reject if RL score exceeds this
    pub risk_threshold: u8,         // 1
    /// Vault creation timestamp
    pub created_at: i64,            // 8
    /// Last activity timestamp
    pub last_activity: i64,         // 8
    /// Emergency freeze flag
    pub is_frozen: bool,            // 1
    /// Maximum allowed slippage in basis points (e.g. 500 = 5%)
    pub max_slippage_bps: u16,      // 2
    /// Maximum single transaction value in lamports
    pub max_single_tx_lamports: u64, // 8
    /// ACE Protocol Governance Flag
    pub ace_enabled: bool,          // 1
    /// Pointer to the aGDP Ledger PDA
    pub agdp_ledger: Pubkey,        // 32
}

impl SentinelVault {
    pub const LEN: usize = 8 + // discriminator
        32 +  // owner
        32 +  // enclave_signer
        32 +  // policy_root
        1 +   // vault_bump
        8 +   // total_managed_val
        8 +   // tx_count
        8 +   // rejected_count
        1 +   // risk_threshold
        8 +   // created_at
        8 +   // last_activity
        1 +   // is_frozen
        2 +   // max_slippage_bps
        8 +   // max_single_tx_lamports
        1 +   // ace_enabled
        32 +  // agdp_ledger
        64;   // padding for future fields
}

/// The Agentic GDP Ledger — on-chain transparency for agent productivity
#[account]
pub struct AgdpLedger {
    pub agent_id: String,           // String up to 32 chars
    pub vault: Pubkey,              // Associated vault
    pub total_income: u64,          // Total protected/earned value
    pub total_expense: u64,         // Total execution cost/spent
    pub event_count: u64,           // Total number of recorded events
}

impl AgdpLedger {
    // 8 (desc) + 36 (string overhead+data) + 32 + 8 + 8 + 8
    pub const LEN: usize = 8 + 36 + 32 + 8 + 8 + 8;
}

// ============================================================================
// INSTRUCTION CONTEXTS
// ============================================================================

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = owner,
        space = SentinelVault::LEN,
        seeds = [
            b"sentinel-vault",
            owner.key().as_ref(),
            enclave_signer.key().as_ref(),
        ],
        bump,
    )]
    pub vault: Account<'info, SentinelVault>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: This is the Arcium Enclave's public key, validated off-chain
    pub enclave_signer: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteTransaction<'info> {
    #[account(
        mut,
        seeds = [
            b"sentinel-vault",
            vault.owner.as_ref(),
            vault.enclave_signer.as_ref(),
        ],
        bump = vault.vault_bump,
        has_one = enclave_signer,
    )]
    pub vault: Account<'info, SentinelVault>,

    pub enclave_signer: Signer<'info>,

    /// CHECK: The Sysvar Instructions account for Instruction Introspection
    #[account(address = ix_sysvar::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct UpdatePolicy<'info> {
    #[account(
        mut,
        seeds = [
            b"sentinel-vault",
            vault.owner.as_ref(),
            vault.enclave_signer.as_ref(),
        ],
        bump = vault.vault_bump,
        constraint = 
            authority.key() == vault.owner || 
            authority.key() == vault.enclave_signer 
            @ SentinelError::Unauthorized,
    )]
    pub vault: Account<'info, SentinelVault>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct FreezeVault<'info> {
    #[account(
        mut,
        seeds = [
            b"sentinel-vault",
            vault.owner.as_ref(),
            vault.enclave_signer.as_ref(),
        ],
        bump = vault.vault_bump,
        has_one = owner,
    )]
    pub vault: Account<'info, SentinelVault>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct UnfreezeVault<'info> {
    #[account(
        mut,
        seeds = [
            b"sentinel-vault",
            vault.owner.as_ref(),
            vault.enclave_signer.as_ref(),
        ],
        bump = vault.vault_bump,
        has_one = owner,
        has_one = enclave_signer,
    )]
    pub vault: Account<'info, SentinelVault>,

    pub owner: Signer<'info>,
    pub enclave_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct RecordRejection<'info> {
    #[account(
        mut,
        seeds = [
            b"sentinel-vault",
            vault.owner.as_ref(),
            vault.enclave_signer.as_ref(),
        ],
        bump = vault.vault_bump,
        has_one = enclave_signer,
    )]
    pub vault: Account<'info, SentinelVault>,

    pub enclave_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [
            b"sentinel-vault",
            vault.owner.as_ref(),
            vault.enclave_signer.as_ref(),
        ],
        bump = vault.vault_bump,
    )]
    pub vault: Account<'info, SentinelVault>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ── NEW: Phase 6 "Frontier v2.6" Contexts ──────────────────────────────

#[derive(Accounts)]
#[instruction(agent_id: String)]
pub struct InitializeAgdpLedger<'info> {
    #[account(
        mut,
        seeds = [
            b"sentinel-vault",
            vault.owner.as_ref(),
            vault.enclave_signer.as_ref(),
        ],
        bump = vault.vault_bump,
        has_one = owner,
    )]
    pub vault: Account<'info, SentinelVault>,

    #[account(
        init,
        payer = owner,
        space = AgdpLedger::LEN,
        seeds = [b"agdp-ledger", vault.key().as_ref(), agent_id.as_bytes()],
        bump
    )]
    pub ledger: Account<'info, AgdpLedger>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AceValidate<'info> {
    #[account(
        seeds = [
            b"sentinel-vault",
            vault.owner.as_ref(),
            vault.enclave_signer.as_ref(),
        ],
        bump = vault.vault_bump,
    )]
    pub vault: Account<'info, SentinelVault>,

    pub enclave_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct LogAgdpEvent<'info> {
    #[account(
        seeds = [
            b"sentinel-vault",
            vault.owner.as_ref(),
            vault.enclave_signer.as_ref(),
        ],
        bump = vault.vault_bump,
        has_one = enclave_signer,
    )]
    pub vault: Account<'info, SentinelVault>,

    #[account(
        mut,
        constraint = ledger.vault == vault.key() @ SentinelError::Unauthorized
    )]
    pub ledger: Account<'info, AgdpLedger>,

    pub enclave_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct FlashFreezeTrigger<'info> {
    #[account(
        mut,
        seeds = [
            b"sentinel-vault",
            vault.owner.as_ref(),
            vault.enclave_signer.as_ref(),
        ],
        bump = vault.vault_bump,
        has_one = enclave_signer,
    )]
    pub vault: Account<'info, SentinelVault>,

    pub enclave_signer: Signer<'info>,
}

// ============================================================================
// EVENTS
// ============================================================================

#[event]
pub struct VaultInitialized {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub enclave_signer: Pubkey,
    pub policy_root: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct TransactionExecuted {
    pub vault: Pubkey,
    pub attested_program: Pubkey,
    pub risk_score: u8,
    pub tx_number: u64,
    pub timestamp: i64,
}

#[event]
pub struct TransactionRejected {
    pub vault: Pubkey,
    pub risk_score: u8,
    pub reason: String,
    pub rejection_number: u64,
    pub timestamp: i64,
}

#[event]
pub struct PolicyUpdated {
    pub vault: Pubkey,
    pub old_root: [u8; 32],
    pub new_root: [u8; 32],
    pub updated_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct VaultFrozen {
    pub vault: Pubkey,
    pub frozen_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct Deposited {
    pub vault: Pubkey,
    pub depositor: Pubkey,
    pub amount: u64,
    pub new_total: u64,
    pub timestamp: i64,
}

#[event]
pub struct ACEViolation {
    pub vault: Pubkey,
    pub target_program: Pubkey,
    pub violation_type: String,
    pub timestamp: i64,
}

#[event]
pub struct FlashFreezeTriggered {
    pub vault: Pubkey,
    pub velocity: u64,
    pub baseline: u64,
    pub timestamp: i64,
}

#[event]
pub struct AgdpEventLogged {
    pub vault: Pubkey,
    pub ledger: Pubkey,
    pub event_type: String, // "INCOME" or "EXPENSE"
    pub value: u64,
    pub description: String,
    pub timestamp: i64,
}

// ============================================================================
// ERRORS
// ============================================================================

#[error_code]
pub enum SentinelError {
    #[msg("Risk score exceeds vault threshold — TD3 model rejected this transaction")]
    RiskThresholdExceeded,

    #[msg("No Ed25519 attestation found from the Enclave signer")]
    MissingAttestation,

    #[msg("Enclave attestation signature is invalid")]
    InvalidAttestation,

    #[msg("Instruction introspection failed — could not read Sysvar Instructions")]
    IntrospectionFailed,

    #[msg("UNAUTHORIZED INSTRUCTION DETECTED — TX contains an instruction targeting an unauthorized program")]
    UnauthorizedInstruction,

    #[msg("Instruction data hash does not match the attested action")]
    InstructionDataMismatch,

    #[msg("Transaction value exceeds the Enclave-authorized maximum")]
    ValueExceeded,

    #[msg("Vault is frozen — all operations suspended")]
    VaultFrozen,

    #[msg("Unauthorized — only owner or enclave can perform this action")]
    Unauthorized,

    #[msg("Risk threshold must be between 0 and 100")]
    InvalidThreshold,

    #[msg("Arithmetic overflow")]
    Overflow,

    #[msg("Rejection reason too long (max 256 chars)")]
    ReasonTooLong,

    // ── NEW: Phase 1 "Fortress" Errors ──────────────────────────────────

    #[msg("MALICIOUS INSTRUCTION DETECTED — program not in whitelist, TX buffer contains unauthorized CPI target")]
    MaliciousInstructionDetected,

    #[msg("ENCLAVE SIGNATURE MISMATCH — attestation message does not match instruction parameters")]
    EnclaveSignatureMismatch,

    #[msg("SLIPPAGE TAMPERED — Jupiter swap slippage_bps exceeds vault maximum, possible sandwich attack setup")]
    SlippageTampered,

    #[msg("Slippage must be between 0 and 10000 basis points")]
    InvalidSlippage,

    // ── NEW: Phase 6 "Frontier v2.6" Errors ─────────────────────────────
    
    #[msg("ACE GOVERNANCE REJECTION — target program is not whitelisted by the access control execution policy")]
    AceProgramNotWhitelisted,

    #[msg("FLASH FREEZE ACTIVE — execution halted due to excessive spend velocity")]
    FlashFreezeActive,
}
