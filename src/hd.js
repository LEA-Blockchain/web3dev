/*
Attribution & Copyright Comments:
Original work Copyright (c) 2022 Patricio Palladino, Paul Miller (paulmillr.com)
This code is based on the original work by Patricio Palladino and Paul Miller.
Modifications Copyright (c) 2025, Allwin Ketnawang (getlea.org)

The MIT License (MIT)

Copyright (c) 2022 Patricio Palladino, Paul Miller (paulmillr.com)
Copyright (c) 2025, Allwin Ketnawang (getlea.org)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

import * as ed25519 from "@noble/ed25519";
import { hmac } from "@noble/hashes/hmac";
import { ripemd160 } from "@noble/hashes/ripemd160";
import { sha256 } from "@noble/hashes/sha256";
import { sha512 } from "@noble/hashes/sha512";
import {
    bytesToHex, concatBytes, createView, hexToBytes, utf8ToBytes
} from "@noble/hashes/utils";

ed25519.etc.sha512Sync = (...messages) => sha512(concatBytes(...messages));

export const MASTER_SECRET = utf8ToBytes('ed25519 seed');
export const HARDENED_OFFSET = 0x80000000; // 2^31
const ZERO = new Uint8Array([0]); // Used for public key prefix

/**
 * Helper function to ensure input is Uint8Array and validate length.
 * @param {Uint8Array | string} input - The input value (Uint8Array or hex string).
 * @param {...number} expectedLengths - Optional expected lengths for validation.
 * @returns {Uint8Array} The validated input as a Uint8Array.
 */
function ensureBytes(input, ...expectedLengths) {
    let bytes;
    if (typeof input === 'string') {
        try { bytes = hexToBytes(input); } catch (e) { throw new TypeError(`Invalid hex string: ${e instanceof Error ? e.message : e}`); }
    } else if (input instanceof Uint8Array) {
        bytes = input;
    } else { throw new TypeError(`Input must be a Uint8Array or a hex string, got ${typeof input}`); }
    if (expectedLengths.length > 0 && !expectedLengths.includes(bytes.length)) { throw new Error(`Invalid input length: ${bytes.length}. Expected one of: ${expectedLengths.join(', ')}`); }
    return bytes;
}

/** BIP32 / SLIP-10 compatible hash160 (SHA256 -> RIPEMD160). */
const hash160 = (data) => ripemd160(sha256(data));
/** Read Uint32BE from Uint8Array. */
const bytesToNumberBE = (bytes) => createView(bytes).getUint32(0, false);
/** Write number to Uint32BE Uint8Array. */
const numberToBytesBE = (num) => {
    if (!Number.isSafeInteger(num) || num < 0 || num >= 2 ** 32) { throw new Error(`Invalid number: ${num}. Must be >= 0 and < 2^32`); }
    const buffer = new Uint8Array(4);
    createView(buffer).setUint32(0, num, false); // Big Endian
    return buffer;
};

/**
 * Represents an Ed25519 Hierarchical Deterministic Key based on SLIP-0010.
 * Focuses on key derivation; sign/verify operations should be done externally.
 */
export class HDKey {
    /** @type {number} Derivation depth */
    depth;
    /** @type {number} Child index this key was derived with */
    index;
    /** @type {number} Fingerprint of the parent key */
    parentFingerprint;
    /** @type {Uint8Array} The 32-byte private key */
    privateKey;
    /** @type {Uint8Array} The 32-byte chain code */
    chainCode;

    /**
     * Private constructor. Use HDKey.fromMasterSeed() to create instances.
     * @param {object} options Internal options.
     * @private
     */
    constructor(options) {
        if (!(options.privateKey instanceof Uint8Array) || options.privateKey.length !== 32) { throw new TypeError("privateKey must be a 32-byte Uint8Array"); }
        if (!(options.chainCode instanceof Uint8Array) || options.chainCode.length !== 32) { throw new TypeError("chainCode must be a 32-byte Uint8Array"); }
        this.depth = options.depth ?? 0;
        this.index = options.index ?? 0;
        this.parentFingerprint = options.parentFingerprint ?? 0;
        if (this.depth === 0) { if (this.parentFingerprint !== 0 || this.index !== 0) { throw new Error("Root key (depth 0) must have parentFingerprint and index set to 0"); } }
        this.privateKey = options.privateKey;
        this.chainCode = options.chainCode;
    }

    /**
     * Creates an HDKey from a master seed.
     * @param {Uint8Array | string} seed - The master seed (bytes or hex string). Recommended: 32 bytes. Min: 16 bytes, Max: 64 bytes.
     * @returns {HDKey} A new HDKey instance representing the master node (m).
     */
    static fromMasterSeed(seed) {
        const seedBytes = ensureBytes(seed);
        const seedLengthBits = seedBytes.length * 8;
        if (seedLengthBits < 128 || seedLengthBits > 512) { throw new Error(`Invalid seed length: ${seedBytes.length} bytes (${seedLengthBits} bits). Must be between 128 and 512 bits.`); }
        const I = hmac(sha512, MASTER_SECRET, seedBytes);
        const privateKey = I.slice(0, 32);
        const chainCode = I.slice(32, 64);
        return new this({ privateKey: privateKey, chainCode: chainCode }); // 'this' refers to HDKey class
    }

    /** The raw 32-byte Ed25519 public key. */
    get publicKeyRaw() {
        // Requires ed25519.etc.sha512Sync to be set globally
        return ed25519.getPublicKey(this.privateKey);
    }

    /** The public key prefixed with 0x00 (for SLIP-10 fingerprinting). */
    get publicKey() {
        return concatBytes(ZERO, this.publicKeyRaw);
    }

    /** The hash160 (SHA256 -> RIPEMD160) of the *prefixed* public key. */
    get pubHash() {
        return hash160(this.publicKey);
    }

    /** The fingerprint of the key (first 4 bytes of pubHash). */
    get fingerprint() {
        return bytesToNumberBE(this.pubHash.slice(0, 4));
    }

    /** Hex representation of the fingerprint. */
    get fingerprintHex() {
        return bytesToHex(numberToBytesBE(this.fingerprint));
    }

    /** Hex representation of the parent fingerprint. */
    get parentFingerprintHex() {
        return bytesToHex(numberToBytesBE(this.parentFingerprint));
    }

    /**
     * Derives a child key based on a BIP32 path string (e.g., "m/44'/501'/0'").
     * NOTE: Ed25519 SLIP-0010 only supports hardened derivation (using ').
     * @param {string} path - The derivation path string. Must start with 'm'.
     * @returns {HDKey} The derived HDKey instance.
     */
    derive(path) {
        if (!/^[mM](?: H)?(\/[0-9]+'?)*$/.test(path)) {
            throw new Error('Invalid derivation path format. Expected "m/..." with hardened indices (e.g., "m/44\'/0\'").');
        }
        if (path === 'm' || path === 'M') { return this; }
        const segments = path.replace(/^[mM]\/?/, '').split('/');
        let currentKey = this;
        for (const segment of segments) {
            const match = /^([0-9]+)('?)$/.exec(segment);
            if (!match) { throw new Error(`Invalid path segment: ${segment}`); }
            let index = parseInt(match[1], 10);
            const isHardened = match[2] === "'";
            if (!Number.isSafeInteger(index) || index >= HARDENED_OFFSET) { throw new Error(`Invalid index number: ${index}. Must be < 2^31.`); }
            if (!isHardened) { throw new Error(`Non-hardened derivation (index ${index}) is not supported for Ed25519 SLIP-0010. Use hardened index (e.g., ${index}').`); }
            index += HARDENED_OFFSET;
            currentKey = currentKey.deriveChild(index);
        }
        return currentKey;
    }

    /**
     * Derives a child key using a specific index.
     * NOTE: Only hardened indices (index >= HARDENED_OFFSET) are supported for Ed25519 SLIP-0010.
     * @param {number} index - The child index number. Must be >= HARDENED_OFFSET.
     * @returns {HDKey} The derived HDKey instance.
     */
    deriveChild(index) {
        if (!Number.isSafeInteger(index) || index < HARDENED_OFFSET || index >= 2 ** 32) { throw new Error(`Invalid index ${index}. Hardened index must be >= ${HARDENED_OFFSET} and < 2^32.`); }
        const indexBytes = numberToBytesBE(index);
        const data = concatBytes(ZERO, this.privateKey, indexBytes); // Data = 0x00 || kpar || ser32(i)
        const I = hmac(sha512, this.chainCode, data); // I = HMAC-SHA512(Key = cpar, Data = data)
        const childPrivateKey = I.slice(0, 32); // I_L
        const childChainCode = I.slice(32, 64); // I_R
        return new this.constructor({ // Use current class constructor
            privateKey: childPrivateKey,
            chainCode: childChainCode,
            depth: this.depth + 1,
            index: index,
            parentFingerprint: this.fingerprint, // Current key's fingerprint
        });
    }

    // Sign and Verify methods are intentionally removed.
    // Use HDKey instance properties (.privateKey, .publicKeyRaw)
    // with base @noble/ed25519 functions (sign, verify) externally.
}