const API_BASE = 'http://localhost:3000/api';

async function testEndpoints() {
    console.log("🚀 Starting AgentGuard Endpoint Validation...\n");

    // 1. Test /api/investigate
    try {
        console.log("🔍 Testing POST /api/investigate...");
        const invRes = await fetch(`${API_BASE}/investigate`, {
            method: 'POST',
            body: JSON.stringify({
                address: "8xM9Yv...4js",
                protocol: "Jupiter"
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        const invData = await invRes.json();
        console.log("✅ Investigate Success:", invData);
    } catch (e: any) {
        console.error("❌ Investigate Failed:", e.message);
    }

    // 2. Test /api/enclave/scan
    try {
        console.log("\n🛡️ Testing POST /api/enclave/scan...");
        const scanRes = await fetch(`${API_BASE}/enclave/scan`, {
            method: 'POST',
            body: JSON.stringify({
                tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
                targetProtocol: "Jupiter",
                txAmount: 1000,
                poolLiquidity: 1000000,
                priceImpact: 0.001,
                tokenAge: 8760,
                holderConcentration: 0.2,
                mintAuthority: false,
                freezeAuthority: false,
                lpLocked: true
            }),
            headers: { 'Content-Type': 'application/json' }
        });
        const scanData: any = await scanRes.json();
        console.log("✅ Scan Success (Verdict):", scanData.verdict);
        console.log("📊 XGBoost Score:", scanData.xgboost?.score);
        console.log("⏳ Total Latency:", scanData.totalLatencyMs, "ms");
    } catch (e: any) {
        console.error("❌ Scan Failed:", e.message);
    }

    console.log("\n🏁 Validation Complete.");
}

testEndpoints();
