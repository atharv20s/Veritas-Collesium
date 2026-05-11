<p align="center">
  <img src="assets/logo.png" width="150" alt="Veritas Logo">
</p>

# Veritas Frontier v2.6 — Sentinel Enclave
### Hardware-Secured, Multi-Agent Forensics for AI Agent Wallets on Solana

![Veritas Banner](assets/banner.png)

Veritas Frontier is a high-fidelity security platform designed to protect AI agents on Solana. It combines **TEE (Trusted Execution Environment)** isolation with **LangGraph Multi-Agent Swarms** to provide a Defense-in-Depth architecture for agentic transactions.

---

## The Problem

AI agents are now autonomous economic actors on Solana. They hold wallets, sign transactions, and move real money — 24/7, with no human in the loop.

**But there is zero security infrastructure built for them.**

- A single compromised LLM prompt can drain an agent's entire wallet in one transaction.
- Agents interact with unverified tokens and protocols with no way to assess risk before signing.
- There is no compliance layer — no spend limits, no program whitelists, no audit trail.
- When an agent gets exploited, there's no forensic record of *what happened* or *why*.

Traditional wallet security (multisig, hardware wallets) was designed for humans. It doesn't work for software agents that need to transact autonomously at machine speed.

> **The gap:** Billions of dollars are flowing into agentic infrastructure (ElizaOS, Virtuals, Sendai), but nobody is building the security layer underneath it. Every agent protocol is one exploit away from a catastrophic loss event.

## Our Solution

Veritas Frontier is a **defense-in-depth security pipeline** that sits between an AI agent and the Solana blockchain. Every transaction an agent proposes must pass through three independent security layers before it ever touches the chain:

**Layer 1 — ACE (Agent Compliance Engine)**
Protocol-level gating that enforces hard rules before any intelligence runs. Program whitelists (only interact with Jupiter, Orca, Raydium), spend limits ($1K per TX), and velocity gates (3x baseline = freeze). If a transaction violates policy, it's rejected instantly — no LLM needed.

**Layer 2 — Multi-Agent Investigation Swarm (LangGraph)**
Three specialized agents run in parallel to analyze the transaction:
- *Forensics Agent* — pulls token history from Helius, runs rugcheck, checks holder concentration
- *Protocol Agent* — verifies on-chain program metadata via FluxRPC
- *Simulation Agent* — simulates the swap on Jupiter to measure real price impact and slippage

A Gemini 2.5 Flash synthesizer merges all findings into a structured risk verdict with chain-of-thought reasoning.

**Layer 3 — TEE Hardware Attestation (AWS Nitro)**
The final verdict is signed inside a Trusted Execution Environment using an isolated Ed25519 coldkey. The TEE produces a cryptographic attestation document (instruction hash + signature + policy hash) that proves the transaction was analyzed and approved by an untampered security enclave. If the risk is too high, the TEE triggers a **Flash-Freeze** — zeroizing the signing key and halting all agent activity.

**The result:** Every approved transaction has a full forensic audit trail — who proposed it, what the swarm found, what the TEE signed, and why. Every blocked transaction has a rejection log with the exact violation. Nothing goes on-chain without passing all three layers.

## Why Now

| Signal | What it means |
|:---|:---|
| **$500M+** flowing into agentic crypto protocols in 2025-2026 | The market for agents is exploding, but security is an afterthought |
| ElizaOS, Virtuals, Sendai all launching agent wallets on Solana | Every one of these needs a security layer — they don't have one |
| Solana processing 50M+ daily transactions | The attack surface is massive and growing |
| No existing "firewall for AI agents" product exists | **First-mover advantage in a category that doesn't exist yet** |

## Business Model

| Revenue Stream | How it works |
|:---|:---|
| **Per-scan API pricing** | Agent protocols pay per transaction scanned (like an API gateway) |
| **Enterprise SLA tiers** | Premium latency, dedicated TEE instances, custom policy rules |
| **Protocol integrations** | White-label Veritas as the security layer inside agent frameworks |
| **Audit-as-a-Service** | On-demand forensic investigations for post-incident analysis |

---

## System Architecture

The full transaction pipeline — from proposal to on-chain broadcast — is shown below.

```mermaid
flowchart TD
    classDef agent fill:#2d1b69,stroke:#a855f7,color:#e9d5ff
    classDef ace fill:#1a1a2e,stroke:#f59e0b,color:#fde68a
    classDef swarm fill:#0f3460,stroke:#06b6d4,color:#cffafe
    classDef synth fill:#1e1b4b,stroke:#818cf8,color:#c7d2fe
    classDef tee fill:#1c1917,stroke:#f97316,color:#fed7aa
    classDef approve fill:#052e16,stroke:#22c55e,color:#bbf7d0
    classDef reject fill:#450a0a,stroke:#ef4444,color:#fecaca
    classDef api fill:#1a1a2e,stroke:#6b7280,color:#d1d5db
    classDef db fill:#0a0a0a,stroke:#22c55e,color:#86efac

    TX["AI AGENT PROPOSES TX\nElizaeth / custom agent\nSOLANA"]:::agent

    subgraph ACE_BLOCK [" AGENTIC COMPLIANCE ENGINE — ACE "]
        direction LR
        PW["PROGRAM WHITELIST\nJupiter · Orca · Raydium"]:::ace
        SVG["SPEND + VELOCITY GATE\n$1k limit · 3x velocity"]:::ace
    end
    AIT["ACE IDENTITY TOKEN V2.6\nIssued on pass"]:::ace

    TX --> ACE_BLOCK --> AIT

    subgraph SWARM_BLOCK [" PARALLEL SWARM — 3 AGENTS · ASYNC "]
        direction LR
        FA["FORENSICS AGENT\nHelius TX · Rugcheck · GoPlus"]:::swarm
        PA["PROTOCOL AGENT\nFluxRPC on-chain verify · Metadata"]:::swarm
        SA["SIMULATION AGENT\nJupiter $1k quote · Price Impact"]:::swarm
    end

    AIT --> SWARM_BLOCK

    FA --> DS1["HELIUS + RUGCHECK +\nDEXSCREENER + JUPITER PRICE"]:::api
    PA --> DS2["FLUXRPC EU / HELIUS RPC\nHolder upgrade with check"]:::api
    SA --> DS3["JUPITER QUOTE API V6\nReal price impact · Slippage classify"]:::api

    DS1 --> SYNTH["GEMINI 2.5 FLASH SYNTHESIZER\nChain-of-thought · JSON output\n5-min token cache — GOOGLE AI"]:::synth
    DS2 --> SYNTH
    DS3 --> SYNTH

    subgraph TEE_BLOCK [" TEE — HARDWARE ATTESTATION BOUNDARY · AWS NITRO V2.0 "]
        direction LR
        KH["KECCAK256 HASHER\nInstruction Fingerprint"]:::tee
        TCS["TEE COLDKEY SIGNER\nSliding window baseline\n3x Flash-Freeze"]:::tee
        FVL["FINAL VERDICT LOGIC\nFail-closed gate"]:::tee
        AD["ATTESTATION DOC\nhardwareId · sig · policyHash"]:::tee
    end

    SYNTH --> TEE_BLOCK

    FVL -->|REJECT| BLOCKED["TX BLOCKED"]:::reject
    FVL -->|APPROVE| APPROVED["APPROVED + SIGNED"]:::approve

    BLOCKED --> FF["FLASH-FREEZE / ZEROIZE\nMemory destroy · threat cache"]:::reject
    APPROVED --> FLUX["FLUXRPC SHIELD SUBMIT\nMEV-protected broadcast"]:::approve

    SH[("scan_history\n— id · wallet_address\n— verdict · xgboost_score\n— total_latency_ms")]:::db
    AR[("agent_reports\n— scan_id · agent_name\n— status · findings")]:::db
    ACER[("ace_rejections\n— agent_id · violation_type\n— estimated_value_usd")]:::db
    TA[("tee_attestations\n— hardware_id · signature\n— policy_hash")]:::db

    SWARM_BLOCK -.->|logs| SH
    SWARM_BLOCK -.->|logs| AR
    ACE_BLOCK -.->|logs| ACER
    TEE_BLOCK -.->|logs| TA
```

### External API Dependencies

| Service | Role | Endpoint |
| :--- | :--- | :--- |
| **Helius API** | Token metadata · TX history | `api.helius.xyz` |
| **Rugcheck.xyz** | Contract audit scores | `rugcheck.xyz` |
| **DexScreener** | Liquidity + price feeds | `api.dexscreener.com` |
| **Google Gemini 2.5 Flash** | Chain-of-thought synthesis | `generativelanguage.googleapis.com` |
| **Jupiter V6 API** | Quote · Swap · Price Impact | `quote-api.jup.ag` |
| **FluxRPC (EU)** | MEV-shielded private RPC | `fluxrpc.com` |

---

## Database ERD (Supabase)

```mermaid
erDiagram
    WALLET_SESSIONS ||--o{ SCAN_HISTORY : "tracks"
    SCAN_HISTORY ||--o{ AGENT_REPORTS : "contains"
    SCAN_HISTORY ||--|| TEE_ATTESTATIONS : "verifies"
    ACE_REJECTIONS }o--|| SCAN_HISTORY : "references"
    AGDP_EVENTS }o--|| WALLET_SESSIONS : "records"

    WALLET_SESSIONS {
        uuid id PK
        text wallet_address
        timestamptz session_start
        timestamptz session_end
        text_arr features_accessed
    }

    SCAN_HISTORY {
        uuid id PK
        text wallet_address
        text token_address
        text target_protocol
        numeric tx_amount
        text verdict
        boolean fast_path
        numeric xgboost_score
        int total_latency_ms
    }

    AGENT_REPORTS {
        uuid id PK
        uuid scan_id FK
        text agent_name
        text status
        text summary
        int latency_ms
        jsonb findings
    }

    ACE_REJECTIONS {
        uuid id PK
        text agent_id
        text target_program
        text violation_type
        numeric estimated_value_usd
        text identity_token
        text policy_version
    }

    AGDP_EVENTS {
        uuid id PK
        text agent_id
        text event_type
        numeric value_usd
        text description
    }

    TEE_ATTESTATIONS {
        uuid id PK
        text agent_id
        text instruction_hash
        text signature
        numeric spend_velocity_pct
        numeric baseline_value
        text status
    }
```

---

## Investigation Swarm (LangGraph)
A multi-agent pipeline that automates deep-dive research into any entity or token.
- **Hunter Agent** — Aggressive web crawler (Tavily) that finds sources and extracts claims.
- **Skeptic Agent** — Adversarial "Devil's Advocate" that cross-examines findings to detect conflicts.
- **Human Handoff** — A circuit breaker that pauses execution when the swarm hits high-severity ambiguity.
- **Synthesizer** — DeepSeek-R1 / Gemini 2.5 Flash LLM that generates premium intelligence reports.

## TEE Enclave Layer (Sentinel)
The hardware root-of-trust for agentic transactions.
- **Sentinel Brain** — A risk-scoring engine that classifies tokens as `SAFE`, `SUSPICIOUS`, or `MALICIOUS` based on Helius and Jupiter data.
- **TEE Signer** — AWS Nitro-simulated enclave that signs every scan result with an isolated Ed25519 keypair.
- **ACE Guard** — Agent Compliance Engine that enforces protocol-level gating (whitelist, spend limits).
- **FluxRPC Shield** — A private RPC relay that protects against MEV and DDoS attacks.

---

## Deployment: Railway & Supabase
Veritas Frontier is optimized for high-uptime, persistent agentic workflows.

1.  **Monorepo Support** — Handles both the Next.js frontend and the Node.js engine seamlessly.
2.  **Persistent SSE** — Unlike Vercel, Railway keeps containers alive for long-running LangGraph investigations.
3.  **Encrypted Vaults** — Secure management of HELIUS, TAVILY, and GEMINI keys.

---

## API Keys Reference
| Key Name | Purpose | Required |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Intelligence synthesis and threat reports | Yes |
| `TAVILY_API_KEY` | Web research and forensic crawling | Yes |
| `HELIUS_API_KEY` | Solana token metadata and history | Yes |
| `FLUXRPC_API_KEY` | MEV-shielded private RPC relay | Yes |
| `JUPITER_API_KEY` | Token liquidity and price impact checks | Yes |
| `SUPABASE_URL` | Log persistence and audit trails | Optional |

---

## Installation
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

---
**Veritas Frontier** — *Securing the Agentic Economy on Solana.*