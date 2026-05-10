import { NextRequest, NextResponse } from "next/server";
import { SentinelBrain } from "@/../../engine/sentinel_brain";
import { VeritasTEEClient } from "@/../../engine/tee_signer";
import { ThreatCache } from "@/../../engine/threat_cache";
import { Keypair, PublicKey } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";

const heliusKey = process.env.HELIUS_API_KEY || "";
const sentinel = new SentinelBrain(heliusKey);
const teeSigner = new VeritasTEEClient(Keypair.generate()); // In prod, this would be a persistent key in TEE

// Supabase init (Optional/Graceful degradation)
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY 
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    : null;

export async function POST(req: NextRequest) {
    try {
        const { address } = await req.json();

        if (!address) {
            return NextResponse.json({ error: "Address is required" }, { status: 400 });
        }

        console.log(`🛡️ [ENCLAVE] Initiating scan for: ${address}`);

        // 1. Threat Cache Check
        if (ThreatCache.has(address)) {
            console.log("⚡ [ENCLAVE] Fast-path Rejection: Cached Threat.");
            return NextResponse.json({
                verdict: 'MALICIOUS',
                score: 100,
                flags: ['CACHED_THREAT'],
                cached: true
            });
        }

        // 2. Fetch Data (Helius/Jupiter)
        const tokenData = await sentinel.fetchTokenData(address);

        // 3. Risk Scoring (Sentinel Brain)
        const report = await sentinel.computeThreatScore(tokenData);

        // 4. TEE Signing
        // For scan results, we sign a summary of the report
        const reportHash = Buffer.from(JSON.stringify(report)).toString('hex');
        const attestation = await teeSigner.getAttestationDoc();
        
        // Mocking the signing of the report hash
        const signature = "0xSignedScanResult"; 

        const result = {
            address,
            symbol: tokenData.symbol,
            name: tokenData.name,
            ...report,
            attestation,
            signature,
            timestamp: Date.now()
        };

        // 5. Persist to Supabase
        if (supabase) {
            await supabase.from('scans').insert([result]).catch(err => console.error("Supabase persist failed:", err));
        }

        // 6. Update Threat Cache if malicious
        if (report.verdict === 'MALICIOUS') {
            ThreatCache.add(address);
        }

        return NextResponse.json(result);
    } catch (err: any) {
        console.error("Enclave scan error:", err);
        return NextResponse.json({ error: err.message || "Internal scan error" }, { status: 500 });
    }
}
