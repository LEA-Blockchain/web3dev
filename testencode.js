// Imports: Assuming these paths are correct for your project structure.
// import { Connection, Wallet, Keypair, PublicKey, bytesToHex, SystemProgram, Transaction, decodeTransaction } from './dist/lea-wallet.node.mjs';
import { Connection, Wallet, Keypair, SLHKeypair, PublicKey, bytesToHex, SystemProgram, Transaction, decodeTransaction } from './src/index.js';
import { Address } from './src/address.js'; // Assuming Address is exported from index.js
import { utf8ToBytes } from './src/utils.js'; // Assuming utf8ToBytes is exported from utils.js
// --- Configuration ---
const SENDER_ACCOUNT_INDEX = 0;
const MNEMONIC = "legal winner thank year wave sausage worth useful legal winner thank yellow";
const TARGET_PUBLIC_KEY_STRING = 'lea1ztv2s3k6xfydjvvu3mtvtu8jycpyvvpn65zuh6tencqsvxt0fvxqw0rqww';
const TRANSFER_AMOUNT = 1000000n; // 1 LEA (if 1 LEA = 1,000,000 smallest units)
const RPC_CLUSTER_URL = "local"; // Or "devnet", "testnet", etc.

// --- Helper Functions ---
async function logBalances(connection, ...pubKeys) {
    try {
        const balances = await connection.getBalance(pubKeys);
        console.log("\n--- Account Balances ---");
        pubKeys.forEach((key, index) => {
            console.log(`Balance for ${key}: ${balances[index]}`);
        });
    } catch (error) {
        console.error("Error fetching balances:", error);
    }
}

async function fetchAndLogTransactionHistory(connection, accountPublicKeyString) {
    try {
        console.log(`\n--- Transaction History for ${accountPublicKeyString} ---`);
        let currentPage = 1;
        let nextCursor = null; // Initialized to null
        const limit = 3; // Fetch 3 transactions per page for demonstration

        do {
            console.log(`Fetching Page ${currentPage} (limit: ${limit}, before: ${nextCursor || 'N/A'})`);

            const requestOptions = {
                accountKey: accountPublicKeyString,
                limit: limit,
            };
            if (nextCursor) { // Only add 'before' if nextCursor is truthy (not null/undefined)
                requestOptions.before = nextCursor;
            }

            const pageData = await connection.getTransactionsForAccount(requestOptions);

            if (pageData.transactions && pageData.transactions.length > 0) {
                console.log(`Page ${currentPage} Transactions:`);
                pageData.transactions.forEach((txHex, index) => {
                    console.log(`  Tx ${index + 1}: ${txHex.substring(0, 60)}...`); // Log snippet
                });
            } else {
                console.log(`Page ${currentPage}: No transactions found.`);
            }

            nextCursor = pageData.nextBefore;
            currentPage++;

            if (!nextCursor) {
                console.log("No more pages.");
            }

        } while (nextCursor);

    } catch (error) {
        console.error(`Error fetching transaction history for ${accountPublicKeyString}:`, error);
    }
}


// --- Main Script Logic ---
(async () => {
    try {
        // 1. Setup Wallet and Sender Account
        console.log("--- Wallet Setup ---");
        const wallet = Wallet.fromMnemonic(MNEMONIC);
        const senderAccount = await wallet.getAccount(SENDER_ACCOUNT_INDEX);
        console.log('senderAccount', senderAccount);
        //const senderPublicKeyStringEdDsa = senderAccount.edDsa.publicKey.toString();
        //const senderPublicKeyStringSlhDsa = senderAccount.slhDsa.publicKey.toString();
        //console.log(`Sender Account edDsa (${SENDER_ACCOUNT_INDEX}): ${senderPublicKeyStringEdDsa}`);
        //console.log(`Sender Account slhDsa (${SENDER_ACCOUNT_INDEX}): ${senderPublicKeyStringSlhDsa}`);
        console.log(`LEA Address: ${senderAccount.address}`);
        //process.exit();
        // Generate an SLH-DSA keypair using the new wallet method
        //const slhAccountIndex = 0;
        //const slhKeypair = await wallet.getAccountPqc(slhAccountIndex);
        //const slhPublicKeyString = slhKeypair.publicKey.toString();
        //console.log(`SLH-DSA Account (${slhAccountIndex}): ${slhPublicKeyString}`);

        // 2. Establish RPC Connection
        const connection = Connection(RPC_CLUSTER_URL);
        console.log(`\n--- Connected to RPC: ${connection.url} ---`);

        // 3. Get Initial Balances (Optional, for context)
        await logBalances(connection, senderAccount.address.toString(), TARGET_PUBLIC_KEY_STRING);

        // 4. Create and Send Transaction
        console.log("\n--- Creating and Sending Transaction ---");
        const { blockhash } = await connection.getLatestBlockhash();
        console.log("Latest Blockhash:", blockhash);

        const transaction = new Transaction();
        transaction.add(SystemProgram.transfer({
            fromPubkeyPairHash: senderAccount.address,
            toPubkeyPairHash: new Address(TARGET_PUBLIC_KEY_STRING),
            amount: TRANSFER_AMOUNT,
        }));
        transaction.recentBlockhash = blockhash;

        // Sign the transaction with both keypairs
        await transaction.sign(senderAccount);
        //await transaction.sign(senderAccount);

        const signedTransactionBytes = await transaction.toBytes();
        const signedTransactionHex = bytesToHex(signedTransactionBytes);
        console.log(`Signed Transaction (${signedTransactionBytes.length} bytes): ${signedTransactionHex}`);

        /* auth token test */
        console.log("\n--- Signing Message for Auth Token Test ---");
        const timestamp = (new Date().getTime()).toString();
        const messageSignAccount = await wallet.getAccount(99);
        const messageSignature = await messageSignAccount.edDsa.sign(utf8ToBytes(timestamp));
        console.log("Message Signature:", bytesToHex(messageSignature));

        // Send the transaction (sendTransaction expects a hex string)
        const sendTxResponse = await connection.sendTransaction(signedTransactionHex);
        const transactionId = sendTxResponse[0]; // Assuming server returns [txId]
        console.log('Transaction Sent! ID:', transactionId);

        // 5. Verify Transaction and Balances
        console.log("\n--- Post-Transaction Verification ---");
        // Give a slight delay for the transaction to be processed by the local node
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

        const fetchedTransaction = await connection.getTransaction(transactionId);
        console.log('Fetched Transaction by ID (Hex):', fetchedTransaction.substring(0, 100) + "...");
        if (fetchedTransaction !== signedTransactionHex) {
            console.warn("Warning: Fetched transaction hex does not match sent transaction hex. This might be due to server-side re-serialization or an issue.");
        }

        //await logBalances(connection, senderPublicKeyString, TARGET_PUBLIC_KEY_STRING);

        // 6. Fetch Transaction History for the sender
        //await fetchAndLogTransactionHistory(connection, senderPublicKeyString);
        // Optionally, fetch for the receiver too
        // await fetchAndLogTransactionHistory(connection, TARGET_PUBLIC_KEY_STRING);


    } catch (error) {
        console.error("\n--- SCRIPT FAILED ---");
        console.error(error);
    }
})();