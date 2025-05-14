// Import necessary modules from your library
import { Wallet, PublicKey, utf8ToBytes, bytesToHex } from './dist/lea-wallet.node.mjs';

// Add console logs to check imports immediately
console.log("--- Checking Imports ---");
console.log("Imported Wallet:", typeof Wallet, Wallet);
console.log("Imported PublicKey:", typeof PublicKey, PublicKey);
console.log("--- End Checking Imports ---");


// Import Node.js built-in test runner and assertion library
import { describe, it, before } from 'node:test'; // Added 'before'
import assert from 'node:assert/strict';

// --- Test Configuration ---
const TEST_MNEMONIC = "legal winner thank year wave sausage worth useful legal winner thank yellow";
const ACCOUNT_INDEX = 0;
const INCORRECT_PUBLIC_KEY_ADDRESS = "lea1vr3s0unrm7cx26sephep35d84dtvcjvtcwy9ty9vthfgnyl2vwpsgf4txp"; // Ensure this is actually different from the derived one

// --- Test Suite ---
describe('Lea Wallet Tests (Node.js)', () => {
    // Define variables in the suite scope
    let wallet;
    let keypair;
    let publicKey;
    let publicKeyHex;
    let address;
    let message;
    let messageBytes;
    let signature;
    let correctLoadedPublicKey; // To store the PK loaded from the correct address

    // Setup hook: Runs ONCE before all 'it' blocks in this 'describe'
    before(async () => {
        console.log("--- Running Before Hook ---");
        console.log("Using Mnemonic:", TEST_MNEMONIC);

        // 1. Create Wallet
        // Use a try-catch here to provide more specific feedback if Wallet creation fails
        try {
            wallet = Wallet.fromMnemonic(TEST_MNEMONIC);
            assert.ok(wallet, 'Wallet creation failed in before hook'); // Basic check if wallet is truthy
            // Check type more robustly if instanceof is problematic
            assert.strictEqual(typeof wallet.getAccount, 'function', 'Wallet does not have getAccount method');
        } catch (e) {
            console.error("ERROR CREATING WALLET IN BEFORE HOOK:", e);
            throw e; // Re-throw to fail the setup
        }
        console.log("Wallet created.");

        // 2. Get Account (Keypair)
        keypair = wallet.getAccount(ACCOUNT_INDEX);
        assert.ok(keypair && keypair.publicKey && typeof keypair.sign === 'function', `Keypair derivation failed for account ${ACCOUNT_INDEX}`);
        console.log(`Keypair for account ${ACCOUNT_INDEX} derived.`);

        // 3. Get Public Key details
        publicKey = keypair.publicKey;
        assert.ok(publicKey, 'Failed to get publicKey from keypair');
        assert.strictEqual(typeof publicKey.toBytes, 'function', 'PublicKey does not have toBytes method');
        assert.strictEqual(typeof publicKey.toString, 'function', 'PublicKey does not have toString method');

        const publicKeyBytes = publicKey.toBytes();
        publicKeyHex = bytesToHex(publicKeyBytes);
        address = publicKey.toString(); // Assumes toString() gives the Bech32m address
        console.log("Derived Public Key (Hex):", publicKeyHex);
        console.log("Derived Address (Bech32m):", address);

        // Ensure the incorrect address is actually different
        assert.notStrictEqual(address, INCORRECT_PUBLIC_KEY_ADDRESS, 'Test setup error: Incorrect public key is the same as the derived correct one');

        // 4. Prepare message
        message = "Test message for Lea Wallet Node.js @ " + new Date().toISOString();
        messageBytes = utf8ToBytes(message);
        console.log("Message to Sign:", message);
        console.log("Message (Bytes):", bytesToHex(messageBytes));

        // 5. Sign message
        signature = await keypair.sign(messageBytes);
        assert.ok(signature instanceof Uint8Array && signature.length > 0, 'Signature generation failed or returned empty');
        console.log("Signature (Hex):", bytesToHex(signature));
        console.log("Signature length:", signature.length);

        // 6. Pre-load the correct public key from string for a later test
        correctLoadedPublicKey = new PublicKey(address);
        assert.ok(correctLoadedPublicKey, 'Failed to reconstruct PublicKey from correct address string');

        console.log("--- Before Hook Finished ---");
    });

    // --- Individual Test Cases ---
    // These now assume the 'before' hook succeeded and variables are populated

    it('should have created a valid wallet and keypair in setup', () => {
        // Assertions primarily happen in the 'before' hook,
        // but we can double-check the variables are accessible here.
        assert.ok(wallet, 'Wallet variable not set');
        assert.ok(keypair, 'Keypair variable not set');
        assert.ok(publicKey, 'PublicKey variable not set');
        assert.ok(address && address.startsWith('lea1'), 'Address variable not set or invalid');
    });

    it('should reconstruct PublicKey from address correctly', () => {
        // 'publicKey' is from direct derivation, 'correctLoadedPublicKey' is from string reconstruction
        assert.ok(publicKey.equals(correctLoadedPublicKey), 'PublicKey reconstructed from address string should equal the original');
        console.log("PublicKey reconstruction from address verified.");
    });

    it('should successfully verify a valid signature with the original public key', async () => {
        const isValid = await publicKey.verify(messageBytes, signature);
        assert.ok(isValid, 'Signature verification should succeed with the correct public key');
        console.log("Verification with original public key successful.");
    });

    it('should successfully verify a valid signature with a reconstructed public key', async () => {
        const isValid = await correctLoadedPublicKey.verify(messageBytes, signature);
        assert.ok(isValid, 'Signature verification should succeed with the reconstructed public key');
        console.log("Verification with reconstructed public key successful.");
    });


    it('should fail to verify a valid signature with an incorrect public key', async () => {
        const incorrectPublicKey = new PublicKey(INCORRECT_PUBLIC_KEY_ADDRESS);
        const isValid = await incorrectPublicKey.verify(messageBytes, signature);
        assert.strictEqual(isValid, false, 'Signature verification should fail with an incorrect public key');
        console.log("Verification with incorrect public key failed as expected.");
    });

    // Add more 'it' blocks for other specific test cases if needed

}); // End of describe block