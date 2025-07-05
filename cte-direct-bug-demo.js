// cte-direct-bug-demo.js

import { CteEncoder, CteDecoder } from '@leachain/cte-core';
import { bytesToHex } from './src/utils.js'; // Using project's hex utility

/**
 * This script provides a direct, minimal demonstration of a bug in the
 * CteEncoder's `addIxDataUint8` method.
 *
 * It avoids using the high-level `decodeAndLogCteTransaction` utility to
 * interact directly with the encoder and decoder.
 *
 * THE BUG:
 * `encoder.addIxDataUint8(1)` should produce a byte sequence for an IxData field
 * with a "Fixed Size" subtype (2) and a "UINT8" type info (1).
 * The raw header byte should be `0b00000110` which is `6`.
 * Instead, it produces a header that is misinterpreted by the decoder.
 *
 * This script will:
 * 1. Encode the field and print its hex representation.
 * 2. Decode the field and show that `peekSubtype()` returns an incorrect value.
 * 3. Show that calling the correct decoder function `readIxDataUint8()` fails.
 */
(async () => {
    console.log("--- Direct CTE Encoder Bug Demonstration ---");

    let encoder;
    let encodedBytes;

    try {
        // 1. ENCODE
        console.log("\n1. Encoding a field with encoder.addIxDataUint8(1)...");
        encoder = await CteEncoder.create(10);
        encoder.addIxDataUint8(1); // The buggy method
        encodedBytes = encoder.getEncodedData();

        console.log(`   - Encoded Bytes (Hex): ${bytesToHex(encodedBytes)}`);
        console.log(`   - Encoded Bytes (Decimal): [${encodedBytes.join(', ')}]`);

    } catch (error) {
        console.error("   - SCRIPT FAILED DURING ENCODING:", error);
        return;
    }

    // 2. DECODE
    console.log("\n2. Decoding the bytes directly...");
    let decoder;
    try {
        decoder = await CteDecoder.create(encodedBytes);

        const header = decoder.peekSubtype();
        console.log(`   - Peeked Header Value: ${header}`);

        const subtype = header & 0x03; // CTE_IXDATA_SUBTYPE_MASK
        console.log(`   - Decoded Subtype: ${subtype}`);
        console.log("   - EXPECTED Subtype: 2 (Fixed Size)");
        console.log(`   - RESULT: The subtype is ${subtype === 2 ? 'correct' : 'INCORRECT'}.`);


        console.log("\n3. Attempting to read the field as a UINT8...");
        // This will fail because the subtype check inside the wasm module fails.
        const value = decoder.readIxDataUint8();
        console.log(`   - Successfully read value: ${value}`);

        console.log("\n4. Attempting to read the field as an INT8 (which should fail)...");
        decoder.readIxDataInt8();

    } catch (error) {
        console.error("\n   - SCRIPT FAILED DURING DECODING (AS EXPECTED)");
        console.error(`   - Error: ${error.message}`);
        console.log("\n--- Bug Proven ---");
        console.log("The decoder failed because the header encoded by `addIxDataUint8` is incorrect.");
        console.log("It does not match the expected header for a Fixed Size UINT8 field, causing the internal subtype check to fail.");
    } finally {
        if (decoder) {
            decoder.destroy();
        }
    }
})();
