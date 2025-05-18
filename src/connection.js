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
            local: "http://localhost:3000",
            localhost: "http://localhost:3000",
        };

        if (!clusterUrls[cluster]) {
            throw new Error(`Unknown cluster: ${cluster}`);
        }

        return clusterUrls[cluster];
    }

    async _sendRequest(method, params) {
        const response = await fetch(this.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                jsonrpc: "1.0",
                method,
                ...(params !== undefined && { params }) //params: []
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error from ${this.url}: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.result) {
            throw new Error(`Malformed response from ${this.url} for method '${method}': ${JSON.stringify(data)}`);
        }

        return data.result;
    }

    getVersion() {
        return this._sendRequest("getVersion");
    }

    getLatestBlockhash() {
        return this._sendRequest("getLatestBlockhash");
    }

    sendTransaction(tx) {
        return this._sendRequest("sendTransaction", tx);
    }

    getBalance(addrs) {
        return this._sendRequest("getBalance", addrs);
    }
}

export const Connection = (cluster = "devnet") => new ConnectionImpl(cluster);
