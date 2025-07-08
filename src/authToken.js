import { SctpEncoder } from '@leachain/sctp';
import { uint8ArrayToBase64 } from './utils.js';

/**
 * JSDoc type definitions for key pair structures, replacing TypeScript interfaces.
 */
/**
 * @typedef {Object} KeyPair
 * @property {{ toBytes(): Uint8Array }} publicKey
 */

/**
 * @typedef {Object} SigningKeyPair
 * @property {{ toBytes(): Uint8Array }} publicKey
 * @property {(message: Uint8Array) => Promise<Uint8Array>} sign
 */

/**
 * @class AuthTokenGenerator
 * @description A class to generate authentication tokens using plain JavaScript.
 * It encapsulates the logic for encoding and signing token data.
 */
export class AuthTokenGenerator {
    // Private class fields to hold the cryptographic key pairs
    #edDsa;
    #slhDsa;

    /**
     * Constructs an instance of the AuthTokenGenerator.
     * @param {{ edDsa: SigningKeyPair, slhDsa: KeyPair }} keys - The cryptographic keys.
     * @param {SigningKeyPair} keys.edDsa - The ED-DSA key pair for signing the token.
     * @param {KeyPair} keys.slhDsa - The SLH-DSA key pair whose public key is included in the token.
     */
    constructor(edDsa, slhDsa) {
        if (!edDsa || !slhDsa) {
            a
            throw new Error("ED-DSA and SLH-DSA key pairs must be provided.");
        }
        this.#edDsa = edDsa;
        this.#slhDsa = slhDsa;
    }

    /**
     * Generates a new authentication token.
     * @param {number} [ttl_seconds=360] - The time-to-live for the token in seconds. Defaults to 360 seconds (6 minutes).
     * @returns {Promise<Uint8Array>} A promise that resolves with the generated token as a Uint8Array.
     */
    async generate(ttl_seconds = 360) {
        // Initialize the SCTP encoder
        const encoder = await SctpEncoder();
        encoder.init(2000); // Initialize with a buffer size

        // Add token version identifier (e.g., 0x10)
        encoder.addUint8(0x10);

        // Calculate creation and expiration timestamps
        const creationTimestamp = Math.floor(Date.now() / 1000);
        const expirationTimestamp = creationTimestamp + ttl_seconds;

        // Add public keys to the token payload
        encoder.addVector(this.#edDsa.publicKey.toBytes());
        encoder.addVector(this.#slhDsa.publicKey.toBytes());

        // Add the expiration timestamp as a ULEB128-encoded integer
        encoder.addUleb128(BigInt(expirationTimestamp));

        // Sign the encoded payload up to this point
        const payloadToSign = encoder.getBytes();
        const signature = await this.#edDsa.sign(payloadToSign);

        // Append the signature to the token
        encoder.addVector(signature);

        // Build the final token
        const token = encoder.build();

        return uint8ArrayToBase64(token);
    }
}

/**
 * Example Usage:
 *
 * async function main() {
 * // These would be your actual, initialized key pairs
 * const mockEdDsaKeyPair = {
 * publicKey: { toBytes: () => new Uint8Array(32).fill(1) },
 * sign: async (msg) => new Uint8Array(64).fill(2),
 * };
 *
 * const mockSlhDsaKeyPair = {
 * publicKey: { toBytes: () => new Uint8Array(64).fill(3) },
 * };
 *
 * try {
 * // 1. Create an instance of the generator with your keys
 * const tokenGenerator = new AuthTokenGenerator({
 * edDsa: mockEdDsaKeyPair,
 * slhDsa: mockSlhDsaKeyPair,
 * });
 *
 * // 2. Generate a token with the default TTL (6 minutes)
 * console.log("Generating token with default TTL...");
 * const token1 = await tokenGenerator.generate();
 * console.log("Token 1 generated.");
 *
 * // 3. Generate another token with a custom TTL (e.g., 1 hour)
 * console.log("\nGenerating token with 1-hour TTL...");
 * const token2 = await tokenGenerator.generate(3600);
 * console.log("Token 2 generated.");
 *
 * } catch (error) {
 * console.error("Failed to generate token:", error);
 * }
 * }
 *
 * // main();
 *
 */
