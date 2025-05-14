import crypto from 'crypto';
import { ExtendedPoint } from '@noble/ed25519';

function bufferToUnpaddedBinaryString(buffer) {
    let binaryString = '';
    for (const byte of buffer) {
        binaryString += byte.toString(2).padStart(8, '0');
    }
    return binaryString;
}

const limit256 = 2n ** 256n;
const P = 2n ** 255n - 19n;
console.log(limit256);
console.log(P);


function printYmangle(buffer32byte) {
    //console.log('printYmangle', buffer32byte);
    const normed = buffer32byte.slice();

    normed[31] |= 0x7F; //Should pring the value over P

    normed[31] &= ~0x80; // Equivalent to normed[31] = normed[31] & ~0x80;

    const reversedBytes = normed.reverse(); // normed is now reversed

    let hexString = '';
    for (const byte of reversedBytes) {
        hexString += byte.toString(16).padStart(2, '0');
    }
    //    c. Convert the hex string to a BigInt
    const y = BigInt('0x' + hexString);

    // 5. Print the calculated y-coordinate
    console.log(`${y} -mangeld`);

    if (!(0n <= y && y < limit256)) {
        // This check is technically redundant if the input is 32 bytes,
        // as the maximum value from 32 bytes is 2^256 - 1.
        // But keeping it for consistency with the original logic.
        console.log(`WARNING (ZIP 215 check?): y (${y}) is not in the range [0, 2^256)`);
    }

    // Check 2: Against the prime field modulus P (Standard ed25519 check)
    if (!(0n <= y && y < P)) {
        console.log(`ERROR: y is not a valid field (should be < P = ${P})`);
    }
}

function printY(buffer32byte) {
    //console.log('printY', buffer32byte);
    // 1. Define the prime modulus for ed25519
    const originalLastByte = buffer32byte[31];

    // Check if the Most Significant Bit (MSB) is set (1)
    // 0x80 is binary 10000000. The & operator checks if that bit is on.
    const xIsNegative = (originalLastByte & 0x80) !== 0;

    // Print the result of the sign check
    /*
     if (xIsNegative) {
         console.log("X-coordinate sign bit: 1 (X is odd/negative)");
     } else {
         console.log("X-coordinate sign bit: 0 (X is even/non-negative)");
     }
     */

    // 2. Create a copy to avoid modifying the original buffer
    const normed = buffer32byte.slice();

    //normed[31] |= 0x7F; //always invalid

    // 3. Clear the MSB (sign bit) of the last byte in the copy
    //    0x80 = 10000000 in binary. ~0x80 = 01111111.
    //    '& ~0x80' keeps all bits except the MSB, which is set to 0.
    normed[31] &= ~0x80; // Equivalent to normed[31] = normed[31] & ~0x80;

    // 4. Convert the modified bytes (little-endian) to a BigInt
    //    a. Reverse the byte order because it's little-endian
    const reversedBytes = normed.reverse(); // normed is now reversed
    //    b. Convert reversed bytes to a hex string

    //console.log('reversedBytes', reversedBytes);
    let hexString = '';
    for (const byte of reversedBytes) {
        hexString += byte.toString(16).padStart(2, '0');
    }
    //    c. Convert the hex string to a BigInt
    const y = BigInt('0x' + hexString);

    // 5. Print the calculated y-coordinate
    //console.log(`Decoded y-coordinate: ${y}`);
    console.log(`${y} -org`);
    console.log("--------------------------");
    // 6. Perform range checks
    // Check 1: Against 2^256 (Potentially related to ZIP 215)
    if (!(0n <= y && y < limit256)) {
        // This check is technically redundant if the input is 32 bytes,
        // as the maximum value from 32 bytes is 2^256 - 1.
        // But keeping it for consistency with the original logic.
        console.log(`WARNING (ZIP 215 check?): y (${y}) is not in the range [0, 2^256)`);
    }

    // Check 2: Against the prime field modulus P (Standard ed25519 check)
    if (!(0n <= y && y < P)) {
        console.log(`ERROR: y is not a valid field (should be < P = ${P})`);
    }
    //else {
    //    console.log(`INFO: y (${y}) is a valid  (y < P = ${P})`);
    // }

    // Optional: Print comparison values
    // console.log("Comparison limit (2^256):", limit256);
    // console.log("Comparison limit (P):", P);
}
async function testInvalidationLoop(iterations) {
    let originalKeyForFailureHex = null;

    for (let i = 0; i < iterations; i++) {
        let modifiedKey = crypto.randomBytes(32);
        //const modifiedKeyHex = modifiedKey.toString('hex');
        //modifiedKey[0] = 0;
        //modifiedKey[31] = 1;
        //const lastByte = modifiedKey[31];
        console.log('----------');
        printYmangle(new Uint8Array(modifiedKey));
        printY(new Uint8Array(modifiedKey));
        console.log('----------');

        const binaryKey = bufferToUnpaddedBinaryString(modifiedKey);
        try {
            ExtendedPoint.fromHex(modifiedKey, false);
        } catch (error) {
            console.log('!!! BANG !!!', error.message);
            //console.log(binaryKey);

            //console.warn(`WARN: Iteration(${originalKeyForFailureHex}) ${i + 1}: Key correctly rejected: "${error.message}". Key (hex): ${modifiedKeyHex}`);
        }
    }
}

(async () => {
    await testInvalidationLoop(1);
})();