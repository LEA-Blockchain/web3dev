import { SctpDecoder } from '@leachain/sctp';
import { Wallet, SystemProgram, Transaction, Address } from './src/index.js';
//import { decodeAndLogCteTransaction } from './src/debug-utils.js';

// --- Configuration ---
const MNEMONIC = "legal winner thank year wave sausage worth useful legal winner thank yellow";
const ACCOUNT_INDEX = 0;

// --- Main Script Logic ---
(async () => {
    try {
        // 1. Setup Wallet and Account
        console.log("--- Wallet Setup ---");
        const wallet = Wallet.fromMnemonic(MNEMONIC);
        const account = await wallet.getAccount(ACCOUNT_INDEX);

        console.log(`Account Address (bech32m): ${account.address}`);
        console.log('Account Address (Bytes)', account.address.toBytes());

        // --- Test 1: Create and Debug a PublishKeyPair Transaction ---
        console.log("\n\n--- Creating PublishKeyPair Transaction ---");

        const publishTransaction = new Transaction();
        publishTransaction.add(SystemProgram.publishKeyPair({
            address: account.address,
            eddsaPubKey: account.edDsa.publicKey.toBytes(),
            slhPubKey: account.slhDsa.publicKey.toBytes(),
        }));
        // A blockhash is required for serialization, but can be a dummy for this test
        publishTransaction.recentBlockhash = '1111111111111111111111111111111111111111111111111111111111111111';

        // Sign the transaction with both keypairs
        await publishTransaction.sign(account);

        const publishTxBytes = await publishTransaction.toBytes();
        console.log(`\n--- Serialized PublishKeyPair Transaction (${publishTxBytes.length} bytes) ---
`);

        // Use the debugger to log the contents
        console.log("Transaction Bytes:", publishTxBytes);
        //debug
        const decoder = await SctpDecoder();
        const decoded = decoder.decode(publishTxBytes);
        console.log("Decoded Transaction:", decoded);

        /*
                // --- Test 2: Create and Debug a RevokeKeyPair Transaction ---
                console.log("\n\n--- Creating RevokeKeyPair Transaction ---");
        
                const revokeTransaction = new Transaction();
                revokeTransaction.add(SystemProgram.revokeKeyPair({
                    accountPubKeyHash: account.address,
                }));
                revokeTransaction.recentBlockhash = '22222222222222222222222222222222'; // Dummy blockhash
        
                await revokeTransaction.sign(account);
        
                const revokeTxBytes = await revokeTransaction.toBytes();
                console.log(`\n--- Serialized RevokeKeyPair Transaction (${revokeTxBytes.length} bytes) ---
        
                `);
        
                // Use the debugger to log the contents
                await decodeAndLogCteTransaction(revokeTxBytes);
        */

    } catch (error) {
        console.error("\n--- SCRIPT FAILED ---");
        console.error(error);
    }
})();