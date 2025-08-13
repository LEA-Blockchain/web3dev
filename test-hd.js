import assert from 'assert';
import { HDKey } from './src/hd.js';

function bytesToHex(bytes) {
    return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}

async function testDerivation() {
    console.log("Running HDKey derivation test...");

    try {
        const seed = '000102030405060708090a0b0c0d0e0f';
        const hdkey = await HDKey.fromMasterSeed(seed);

        // Test case 1: Derive a key
        const path = "m/44'/0'/0'";
        const derivedKey = await hdkey.derive(path);

        // Check type and length
        assert(derivedKey instanceof Uint8Array, 'Derived key should be a Uint8Array');
        assert.strictEqual(derivedKey.length, 32, 'Derived key should be 32 bytes long');

        const expectedHex = '91af8d726d56bb9d6e6ea01703650ab4ce9502c65ca08b260db5d03ec6317245';
        const derivedHex = bytesToHex(derivedKey);

        assert.strictEqual(derivedHex, expectedHex, `Derived key does not match expected value for path ${path}`);

        console.log("[PASS] Derivation test passed.");

    } catch (error) {
        console.error("[FAIL] Derivation test failed:", error);
        process.exit(1);
    }
}

async function runTests() {
    await testDerivation();
    // Add more tests here if needed
}

runTests().catch(err => {
    console.error("Error running tests:", err);
    process.exit(1);
});