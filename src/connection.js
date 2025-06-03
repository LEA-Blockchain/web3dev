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
            local: "http://localhost:3000", // Default for local development
            localhost: "http://localhost:3000",
        };

        if (!clusterUrls[cluster]) {
            throw new Error(`Unknown cluster: ${cluster}`);
        }

        return clusterUrls[cluster];
    }

    async _sendRequest(method, params) {
        const requestBody = {
            jsonrpc: "1.0", // Assuming your server still uses 1.0
            id: 1, // Default ID, can be made dynamic if needed
            method,
        };

        // Only include params if it's provided and not undefined.
        // The server expects params to be an array.
        if (params !== undefined) {
            // This line ensures that what _sendRequest receives as 'params'
            // (which should be correctly formatted by the calling public method)
            // is directly used.
            requestBody.params = params;
        }


        const response = await fetch(this.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error from ${this.url} for method '${method}': ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();

        // Check for JSON-RPC level errors
        if (data.error) {
            throw new Error(`RPC error from ${this.url} for method '${method}': ${data.error.message} (Code: ${data.error.code})`);
        }

        if (data.result === undefined) { // Check for undefined specifically, as null can be a valid result.
            throw new Error(`Malformed response from ${this.url} for method '${method}': Missing 'result' field. Response: ${JSON.stringify(data)}`);
        }

        return data.result;
    }

    /**
     * Retrieves the current RPC API version.
     * @returns {Promise<object>} A promise that resolves to the version information.
     */
    getVersion() {
        return this._sendRequest("getVersion"); // No params needed
    }

    /**
     * Retrieves the latest blockhash.
     * @returns {Promise<object>} A promise that resolves to an object containing the blockhash.
     */
    getLatestBlockhash() {
        return this._sendRequest("getLatestBlockhash"); // No params needed
    }

    /**
     * Sends a transaction to the network.
     * @param {string | Array<string>} txInput - The hex-encoded serialized transaction,
     * either as a direct string or as an array containing a single hex string.
     * @returns {Promise<Array<string>>} A promise that resolves to an array containing the transaction ID.
     */
    sendTransaction(txInput) {
        let paramsForServer;
        if (typeof txInput === 'string') {
            // If input is "hexString", server expects params: ["hexString"]
            paramsForServer = [txInput];
        } else if (Array.isArray(txInput) && txInput.length === 1 && typeof txInput[0] === 'string') {
            // If input is ["hexString"] (from potentially unchanged testencode.js), server expects params: ["hexString"]
            paramsForServer = txInput;
        } else {
            // Handle cases where txInput is a Uint8Array or other invalid type
            if (txInput instanceof Uint8Array) {
                 return Promise.reject(new Error("Invalid input for sendTransaction: Received Uint8Array. Please provide a hex-encoded string."));
            }
            return Promise.reject(new Error("Invalid input for sendTransaction: Expected a hex string or an array containing a single hex string."));
        }
        return this._sendRequest("sendTransaction", paramsForServer);
    }

    /**
     * Retrieves the balances for an array of account public keys.
     * @param {Array<string>} accountPublicKeys - An array of account public key strings.
     * @returns {Promise<Array<string>>} A promise that resolves to an array of balance strings.
     */
    getBalance(accountPublicKeys) {
        // The server expects params to be the array of public key strings directly.
        if (!Array.isArray(accountPublicKeys)) {
            return Promise.reject(new Error("Invalid input for getBalance: Expected an array of public key strings."));
        }
        // Pass accountPublicKeys directly, as the server expects params: ["pubkey1", "pubkey2", ...]
        return this._sendRequest("getBalance", accountPublicKeys);
    }

    /**
     * Retrieves a specific transaction by its ID.
     * @param {string} transactionId - The ID (hash) of the transaction.
     * @returns {Promise<string>} A promise that resolves to the hex-encoded binary transaction data.
     */
    getTransaction(transactionId) {
        if (typeof transactionId !== 'string') {
             return Promise.reject(new Error("Invalid input for getTransaction: Expected a transaction ID string."));
        }
        // The server expects params as an array: [transactionId]
        return this._sendRequest("getTransaction", [transactionId]);
    }

    /**
     * Retrieves transactions for a specific account, with pagination.
     * @param {object} options - Options for fetching transactions.
     * @param {string} options.accountKey - The public key of the account.
     * @param {number} [options.limit=10] - The maximum number of transactions to return.
     * @param {string} [options.before] - A transaction ID to fetch transactions older than this one (for pagination).
     * @returns {Promise<object>} A promise that resolves to an object containing an array of hex-encoded transactions and a 'nextBefore' cursor.
     * Example: { transactions: ["hexTx1", "hexTx2"], nextBefore: "lastTxIdInList" | null }
     */
    getTransactionsForAccount(options) {
        // The server expects params as an array containing the options object: [options]
        if (!options || typeof options.accountKey !== 'string') {
            return Promise.reject(new Error("getTransactionsForAccount requires an options object with an 'accountKey' string."));
        }
        return this._sendRequest("getTransactionsForAccount", [options]);
    }
}

export const Connection = (cluster = "devnet") => new ConnectionImpl(cluster);
