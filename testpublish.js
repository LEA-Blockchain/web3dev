import { Wallet } from './src/index.js';
import { createTransaction } from '@leachain/ltm';
import { generateKeyset } from '@leachain/keygen';
//import { decodeAndLogCteTransaction } from './src/debug-utils.js';

// --- Configuration ---
const MNEMONIC = "legal winner thank year wave sausage worth useful legal winner thank yellow";
const ACCOUNT_INDEX = 0;

// --- Main Script Logic ---
(async () => {
    try {
        // 1. Setup Wallet and Account
        console.log("--- Wallet Setup ---");
        const wallet = await Wallet.fromMnemonic(MNEMONIC);
        const account = await wallet.getAccount(ACCOUNT_INDEX);

        console.log(`Account Address (bech32m): ${account.address}`);
        //console.log(account);
        // --- Test 1: Create and Debug a PublishKeyPair Transaction ---
        console.log("\n\n--- Creating PublishKeyPair Transaction ---");

        const manifest = {
            "comment": "A transaction to publish the feePayer's public keys to a contract.",
            "sequence": 1,
            "feePayer": "publisher",
            "gasLimit": 500000000,
            "gasPrice": 10,
            "signers": [],
            "constants": {
                "contractAddress": "$addr(1111111111111111111111111111111111111111111111111111111111111111)"
            },
            "invocations": [
                {
                    "targetAddress": "$const(contractAddress)",
                    "instructions": [
                        {
                            "uleb": 1
                        },
                        {
                            "INLINE": "$pubset(publisher)"
                        }
                    ]
                }
            ]
        };

        const signerKeys = {
            publisher: account.keyset
        };
        const transactionBytes = await createTransaction(manifest, signerKeys);
        console.log('Output:', transactionBytes);

        process.exit();

    } catch (error) {
        console.error("\n--- SCRIPT FAILED ---");
        console.error(error);
    }
})();