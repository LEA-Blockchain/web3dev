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
        const requestBody = {
            jsonrpc: "1.0",
            id: 1,
            method,
        };
        if (params !== undefined) {
            requestBody.params = params;
        }

        const response = await fetch(this.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // is not kept alive and reused for the next request.
                // PQC signatutres take a long time to compute, so we want to avoid broken pipe
                "Connection": "close"
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(`RPC error: ${data.error.message} (Code: ${data.error.code})`);
        }

        if (data.result === undefined) {
            throw new Error(`Malformed response: Missing 'result' field.`);
        }

        return data.result;
    }

    // --- Public API Methods ---
    getVersion() { return this._sendRequest("getVersion"); }
    getLatestBlockhash() { return this._sendRequest("getLatestBlockhash"); }
    getBalance(keys) { return this._sendRequest("getBalance", keys); }
    getTransaction(id) { return this._sendRequest("getTransaction", [id]); }
    getTransactionsForAccount(opts) { return this._sendRequest("getTransactionsForAccount", [opts]); }

    sendTransaction(txInput) {
        let paramsForServer;
        if (typeof txInput === 'string') {
            paramsForServer = [txInput];
        } else if (Array.isArray(txInput) && txInput.length === 1 && typeof txInput[0] === 'string') {
            paramsForServer = txInput;
        } else {
            return Promise.reject(new Error("Invalid input for sendTransaction: Expected a hex string or an array containing a single hex string."));
        }
        return this._sendRequest("sendTransaction", paramsForServer);
    }
}

export const Connection = (cluster = "devnet") => new ConnectionImpl(cluster);