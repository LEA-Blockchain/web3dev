class ConnectionImpl {
    constructor(cluster = "devnet") {
        this.url = this._resolveClusterUrl(cluster);
    }

    _resolveClusterUrl(cluster) {
        if (typeof cluster === "string" && /^https?:\/\//i.test(cluster)) {
            return cluster;
        }

        const clusterUrls = {
            "mainnet-beta": "https://api.mainnet-beta.getlea.org",
            devnet: "https://api.devnet.getlea.org",
            testnet: "https://api.testnet.getlea.org",
            local: "http://127.0.0.1:60000",
            localhost: "http://localhost:60000",
        };

        if (!clusterUrls[cluster]) {
            throw new Error(`Unknown cluster: ${cluster}`);
        }

        return clusterUrls[cluster];
    }

    /**
     * Sends raw binary data (Uint8Array) via POST and returns:
     * - Uint8Array if there is a binary body
     * - true if body is empty
     */
    async sendTransaction(uint8Data) {
        if (!(uint8Data instanceof Uint8Array)) {
            throw new Error("sendBinary expects a Uint8Array");
        }

        const response = await fetch(`${this.url}/execute`, {
            method: "POST",
            headers: {
                "Content-Type": "application/octet-stream",
                "Connection": "close"
            },
            body: uint8Data
        });

        // Always try to read as binary, even for non-2xx
        const arrayBuffer = await response.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        if (uint8.length === 0) {
            return true; // no body, just signal "OK but empty"
        }

        return uint8;
    }
}

export const Connection = (cluster = "devnet") => new ConnectionImpl(cluster);
