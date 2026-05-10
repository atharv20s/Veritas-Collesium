import axios from "axios";

export class FluxRPCShield {
    private apiKey: string;
    private shieldUrl: string;

    constructor(apiKey: string, shieldUrl: string) {
        this.apiKey = apiKey;
        this.shieldUrl = shieldUrl;
    }

    /**
     * Routes a request through the FluxRPC Shielded relay.
     * Protects against DDoS and MEV (front-running/sandwich attacks).
     */
    async routeRequest(method: string, params: any[]) {
        try {
            const response = await axios.post(this.shieldUrl, {
                jsonrpc: "2.0",
                id: 1,
                method: method,
                params: params
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-Flux-Shield': 'active'
                }
            });
            return response.data;
        } catch (err) {
            console.error("FluxRPC Shield routing error:", err);
            throw new Error("Failed to route request through FluxRPC Shield.");
        }
    }
}
