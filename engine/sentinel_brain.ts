import axios from "axios";

export interface TokenScanData {
    address: string;
    symbol: string;
    name: string;
    priceUsd?: number;
    liquidityUsd?: number;
    volume24h?: number;
    mintAuthority: string | null;
    freezeAuthority: string | null;
    isMutable: boolean;
    txHistory: any[];
}

export type RiskVerdict = 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS';

export interface RiskReport {
    score: number; // 0-100
    verdict: RiskVerdict;
    flags: string[];
}

export class SentinelBrain {
    private heliusKey: string;

    constructor(heliusKey: string) {
        this.heliusKey = heliusKey;
    }

    /**
     * Risk Scoring Engine
     * Computes threat scores based on metadata, liquidity, and transaction history.
     */
    async computeThreatScore(data: TokenScanData): Promise<RiskReport> {
        let score = 0;
        const flags: string[] = [];

        // 1. Authority Check
        if (data.mintAuthority) {
            score += 30;
            flags.push("MINT_AUTHORITY_ENABLED");
        }
        if (data.freezeAuthority) {
            score += 20;
            flags.push("FREEZE_AUTHORITY_ENABLED");
        }
        if (data.isMutable) {
            score += 10;
            flags.push("METADATA_IS_MUTABLE");
        }

        // 2. Liquidity Check
        if (data.liquidityUsd && data.liquidityUsd < 5000) {
            score += 40;
            flags.push("LOW_LIQUIDITY");
        } else if (data.liquidityUsd && data.liquidityUsd < 50000) {
            score += 15;
            flags.push("MODERATE_LIQUIDITY_RISK");
        }

        // 3. Volume/Price anomalies (Simplified)
        if (data.volume24h && data.volume24h < 1000) {
            score += 10;
            flags.push("STAGNANT_TRADING_VOLUME");
        }

        // Final Classification
        let verdict: RiskVerdict = 'SAFE';
        if (score > 70) {
            verdict = 'MALICIOUS';
        } else if (score > 30) {
            verdict = 'SUSPICIOUS';
        }

        return {
            score,
            verdict,
            flags
        };
    }

    /**
     * Fetches raw scan data from Helius
     */
    async fetchTokenData(tokenAddress: string): Promise<TokenScanData> {
        const url = `https://mainnet.helius-rpc.com/?api-key=${this.heliusKey}`;
        
        // Mocking Helius response for the demo/build
        // In reality, this would use axios.post(url, { jsonrpc: '2.0', id: '1', method: 'getAsset', params: { id: tokenAddress } })
        
        return {
            address: tokenAddress,
            symbol: "TKN",
            name: "Target Token",
            mintAuthority: null,
            freezeAuthority: null,
            isMutable: true,
            liquidityUsd: 10000,
            volume24h: 500,
            txHistory: []
        };
    }
}
