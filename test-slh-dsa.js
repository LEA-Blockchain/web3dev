import {
    slh_dsa_sha2_256f //slh_dsa_sha2_256f
} from '@noble/post-quantum/slh-dsa';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { randomBytes } from 'node:crypto';

// Assign the imported algorithm to a variable for easier use
const algorithm = slh_dsa_sha2_256f;

// DEBUG: Log the imported object (optional)
// console.log('DEBUG: Imported algorithm object:', algorithm);

async function generateSignVerify() {
    console.log(`\nUsing algorithm: slh_dsa_sha2_256f`);

    // --- Check Prerequisites ---
    if (typeof algorithm.keygen !== 'function') {
        console.error("ERROR: 'keygen' function not found!");
        return;
    }
    if (typeof algorithm.seedLen !== 'number') {
        console.error("ERROR: 'seedLen' property not found!");
        return;
    }
    if (typeof algorithm.sign !== 'function' || typeof algorithm.verify !== 'function') {
        console.error("ERROR: sign or verify function not found!");
        return;
    }

    // --- Generate a Seed ---
    const seedLength = algorithm.seedLen;
    console.log(`Required seed length: ${seedLength} bytes`);
    console.log("Generating a random seed...");
    const seed = randomBytes(seedLength);

    // --- Key Generation (using keygen with seed) ---
    console.log("Attempting key generation using keygen(seed)...");
    const keyGenerationResult = await algorithm.keygen(seed);
    const { publicKey, secretKey } = keyGenerationResult || {};

    // --- Check if keys were retrieved ---
    if (!publicKey || !secretKey) {
        console.error("ERROR: Failed to retrieve publicKey or secretKey from keygen result.");
        return;
    }

    console.log('Generated Secret Key (Uint8Array):', secretKey);
    console.log('Generated Public Key (Uint8Array):', publicKey);
    console.log(`Secret Key Length: ${secretKey.length} bytes`);
    console.log(`Public Key Length: ${publicKey.length} bytes`);

    // --- Exporting Keys (Example: to Hex) ---
    const secretKeyHex = bytesToHex(secretKey);
    const publicKeyHex = bytesToHex(publicKey);

    console.log('\n--- Exporting ---');
    console.log('Exported Secret Key (Hex):', secretKeyHex);
    console.log('Exported Public Key (Hex):', publicKeyHex);

    // --- Loading Keys (Example: from Hex) ---
    const loadedSecretKey = hexToBytes(secretKeyHex);
    const loadedPublicKey = hexToBytes(publicKeyHex);

    console.log('\n--- Loading ---');
    console.log('Loaded Secret Key (Uint8Array):', loadedSecretKey);
    console.log('Loaded Public Key (Uint8Array):', loadedPublicKey);

    // --- Prepare the Message ---
    const message = new TextEncoder().encode("This is a test message");
    console.log('\n--- Message ---');
    console.log('Original Message (Uint8Array):', message);
    console.log(`Original Message Length: ${message.length} bytes`);

    // --- Signing ---
    // Assuming internal hashing: Pass the raw message
    // Using argument order: sign(secretKey, message) based on previous error
    console.log("\nAttempting to sign the raw message...");
    let signature; // Declare signature variable
    try {
        signature = await algorithm.sign(loadedSecretKey, message);
        console.log('\n--- Verification ---');
        console.log('Signature (Uint8Array):', signature);
        console.log(`Signature Length: ${signature.length} bytes`);
    } catch (error) {
        console.error("ERROR during signing:", error);
        console.error("Signing arguments (lengths):");
        console.error(`  secretKey: ${loadedSecretKey?.length}`);
        console.error(`  message: ${message?.length}`);
        return; // Stop if signing fails
    }


    // --- Verifying ---
    // Assuming internal hashing: Pass the raw message
    // Using argument order: verify(publicKey, message, signature)
    console.log("\nAttempting to verify signature with the raw message...");
    let isValid = false; // Default to false
    try {
        // Ensure signature exists before verifying
        if (!signature) {
            console.error("ERROR: Signature was not generated.");
            return;
        }
        isValid = await algorithm.verify(loadedPublicKey, message, signature);
        console.log('Is signature valid with loaded public key and raw message?', isValid);
    } catch (error) {
        console.error("ERROR during verification:", error);
        // Log arguments if verification throws an error
        console.error("Verification arguments (lengths):");
        console.error(`  publicKey: ${loadedPublicKey?.length}`);
        console.error(`  message: ${message?.length}`);
        console.error(`  signature: ${signature?.length}`);
    }


    // Optional: Return keys if needed elsewhere
    // return { secretKeyHex, publicKeyHex };
}

// Run the example
generateSignVerify().catch(console.error);