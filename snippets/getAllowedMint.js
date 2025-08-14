import { createTransaction } from '@leachain/ltm';
import getAllowedMintManifest from '../manifests/get_allowed_mint.json' with { type: 'json' };

// --- Main Script Logic ---
(async () => {
    try {
        console.log("--- Creating get_allowed_mint Transaction ---");
        const transactionBytes = await createTransaction(getAllowedMintManifest, {});
        console.log('Output:', transactionBytes);
        process.exit(0);

    } catch (error) {
        console.error("\n--- SCRIPT FAILED ---");
        console.error(error);
        process.exit(1);
    }
})();
