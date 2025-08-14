import { Wallet } from '../src/index.js';
import { createTransaction } from '@leachain/ltm';
import { generateKeyset } from '@leachain/keygen';
import publishKeySetManifest from '../manifests/publish_keyset.json' with { type: 'json' };
import transferManifest from '../manifests/transfer.json' with { type: 'json' };
import fs from 'fs';

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
        const signerKeys = {
            publisher: account.keyset
        };
        const transactionBytes = await createTransaction(transferManifest, signerKeys);
        console.log('Output:', transactionBytes);
        //write to file
        fs.writeFileSync('transfer_transaction.bin', transactionBytes);
        console.log('Transaction bytes written to transfer_transaction.bin');
        process.exit();

    } catch (error) {
        console.error("\n--- SCRIPT FAILED ---");
        console.error(error);
    }
})();