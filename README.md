<p align="center">
  <img src="assets/logo.png" width="150" alt="Veritas Logo">
</p>

# Veritas Frontier v2.6 - Sentinel Enclave
### Hardware-Secured, Multi-Agent Forensics for AI Agent Wallets on Solana

![Veritas Banner](assets/banner.png)

Veritas Frontier is a high-fidelity security platform designed to protect AI agents on Solana. It combines **TEE (Trusted Execution Environment)** isolation with **LangGraph Multi-Agent Swarms** to provide a Defense-in-Depth architecture for agentic transactions.

---

## 🏗️ System Architecture & ERD

The following diagram illustrates the relationship between the Multi-Agent Investigation layer, the TEE Security layer, and the On-Chain Governance (ACE).

![AgentGuard ERD](assets/erd.png)

```mermaid
erDiagram
    WALLET_SESSIONS ||--o{ SCAN_HISTORY : "tracks"
    SCAN_HISTORY ||--o{ AGENT_REPORTS : "contains"
    SCAN_HISTORY ||--|| TEE_ATTESTATIONS : "verifies"
    ACE_REJECTIONS ||--o{ AGENT_REPORTS : "logs"
    AGDP_EVENTS ||--o{ WALLET_SESSIONS : "records"

    WALLET_SESSIONS {
        uuid id
        string wallet_address
        timestamptz session_start
        timestamptz session_end
        string_array features_accessed
    }

    SCAN_HISTORY {
        uuid id
        string wallet_address
        string token_address
        string target_protocol
        numeric tx_amount
        string verdict
        boolean fast_path
        numeric xgboost_score
        integer total_latency_ms
    }

    AGENT_REPORTS {
        uuid id
        uuid scan_id
        string agent_name
        string status
        string summary
        integer latency_ms
        jsonb findings
    }

    ACE_REJECTIONS {
        uuid id
        string agent_id
        string target_program
        string violation_type
        numeric estimated_value_usd
        string identity_token
        string policy_version
    }

    AGDP_EVENTS {
        uuid id
        string agent_id
        string event_type
        numeric value_usd
        string description
    }

    TEE_ATTESTATIONS {
        uuid id
        string agent_id
        string instruction_hash
        string signature
        numeric spend_velocity_percent
        numeric baseline_value
        string status
    }
```

---

## 🕵️ Investigation Swarm (LangGraph)
A multi-agent pipeline that automates deep-dive research into any entity or token.
- **Hunter Agent**: Aggressive web crawler (Tavily) that finds sources and extracts claims.
- **Skeptic Agent**: Adversarial "Devil's Advocate" that cross-examines findings to detect conflicts.
- **Human Handoff**: A circuit breaker that pauses execution when the swarm hits high-severity ambiguity.
- **Synthesizer**: DeepSeek-R1 / Gemini 2.0 Flash LLM that generates premium intelligence reports.

## 🛡️ TEE Enclave Layer (Sentinel)
The hardware root-of-trust for agentic transactions.
- **Sentinel Brain**: A risk-scoring engine that classifies tokens as SAFE, SUSPICIOUS, or MALICIOUS based on Helius and Jupiter data.
- **TEE Signer**: AWS Nitro-simulated enclave that signs every scan result with an isolated Ed25519 keypair.
- **ACE Guard**: Agent Compliance Engine that enforces protocol-level gating (whitelist, spend limits).
- **FluxRPC Shield**: A private RPC relay that protects against MEV and DDoS attacks.

---

## 🚀 Deployment: Railway & Supabase
Veritas Frontier is optimized for high-uptime, persistent agentic workflows.

1.  **Monorepo Support**: Handles both the Next.js frontend and the Node.js engine seamlessly.
2.  **Persistent SSE**: Unlike Vercel, Railway keeps containers alive for long-running LangGraph investigations.
3.  **Encrypted Vaults**: Secure management of HELIUS, TAVILY, and GEMINI keys.

---

## 🔑 API Keys Reference
| Key Name | Purpose | Required |
| :--- | :--- | :--- |
| GEMINI_API_KEY | Intelligence synthesis and threat reports | Yes |
| TAVILY_API_KEY | Web research and forensic crawling | Yes |
| HELIUS_API_KEY | Solana token metadata and history | Yes |
| FLUXRPC_API_KEY | MEV-shielded private RPC relay | Yes |
| JUPITER_API_KEY | Token liquidity and price impact checks | Yes |
| SUPABASE_URL | Log persistence and audit trails | Optional |

---

## 🛠️ Installation
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

---
**Veritas Frontier** - *Securing the Agentic Economy on Solana.*