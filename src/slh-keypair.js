import { slh_dsa_sha2_256s as algorithm } from '@noble/post-quantum/slh-dsa';
import { randomBytes } from 'node:crypto';
import { SLHPublicKey } from './slh-public.js';
import { blake3 } from "hash-wasm";


export class SLHKeypairImpl {
    #publicKeyInstance;
    #secretKeyBytes;

    constructor(publicKeyInstance, secretKeyBytes) {
        this.#publicKeyInstance = publicKeyInstance;
        this.#secretKeyBytes = secretKeyBytes;
    }

    get publicKey() {
        return this.#publicKeyInstance;
    }

    /**
     * Returns the full 128-byte secret key (used for signing).
     */
    get secretKey() {
        return Uint8Array.from(this.#secretKeyBytes);
    }
    /**
     * Signs a message using the private key.
     */
    async sign(message) {
        return await algorithm.sign(this.#secretKeyBytes, message);
    }
}

const SLHKeypair = {
    /**
     * Generates a new SLH-DSA keypair from a random seed.
     */
    /*
    generate: async () => {
        const seed = randomBytes(algorithm.seedLen); // usually 96 bytes
        const { publicKey, secretKey } = await algorithm.keygen(seed);
        const publicKeyInstance = new SLHPublicKey(publicKey);
        return new SLHKeypairImpl(publicKeyInstance, secretKey, seed);
    },
    */
    /**
     * Creates an SLHKeypairImpl from a seed, extending the seed to the correct length using BLAKE3 if necessary.
     * @param {Uint8Array} seed - The input seed.
     * @returns {Promise<SLHKeypairImpl>} A promise that resolves to an SLHKeypairImpl instance.
     * @throws {Error} If the seed is invalid after extension.
     */
    fromSecretKey: async (seed) => {
        let extendedSeed = seed;

        if (!seed) {
            throw new Error("Seed cannot be null or undefined.");
        }

        if (seed.length !== algorithm.seedLen) {
            // Extend the seed to the correct length using BLAKE3
            // blake3 returns a hex string, so we need to convert it to Uint8Array
            const hashHex = await blake3(seed, algorithm.seedLen * 8); // blake3 takes bits, so multiply bytes by 8
            extendedSeed = new Uint8Array(hashHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        }

        const { publicKey, secretKey } = await algorithm.keygen(extendedSeed);
        const publicKeyInstance = new SLHPublicKey(publicKey);
        return new SLHKeypairImpl(publicKeyInstance, secretKey, extendedSeed);
    }
};

export { SLHKeypair };
