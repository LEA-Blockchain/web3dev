import { createTransaction } from '@leachain/ltm';
import getBalanceManifest from '../manifests/get_balance.json' with { type: 'json' };

// --- Main Script Logic ---
(async () => {
    try {
        console.log("--- Creating get_balance Transaction ---");
        const transactionBytes = await createTransaction(getBalanceManifest, {});
        console.log('Output:', transactionBytes);
        process.exit(0);

    } catch (error) {
        console.error("\n--- SCRIPT FAILED ---");
        console.error(error);
        process.exit(1);
    }
})();
