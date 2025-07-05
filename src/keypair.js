import { etc, sign, getPublicKey, utils } from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js'
import { concatBytes } from "@noble/hashes/utils";
import { PublicKey } from './publickey.js';
import { randomBytes } from '@noble/hashes/utils';

etc.sha512Sync = (...messages) => sha512(concatBytes(...messages));

export class KeypairImpl {
    #publicKeyInstance;
    #secretKeyBytes;

    constructor(publicKeyInstance, secretKeyBytes) {
        this.#publicKeyInstance = publicKeyInstance;
        this.#secretKeyBytes = secretKeyBytes;
    }

    get publicKey() {
        return this.#publicKeyInstance;
    }

    get secretKey() {
        return Uint8Array.from(this.#secretKeyBytes.slice(0, 32));
    }

    async sign(message) {
        const signature = await sign(message, this.secretKey);
        return signature;
    }
}

const Keypair = {
    /*
    generate: () => {
        const randomSeed = randomBytes(32);
        const publicKeyBytes = getPublicKey(randomSeed);
        const publicKeyInstance = new PublicKey(publicKeyBytes);
        return new KeypairImpl(publicKeyInstance, randomSeed);
    },
    */
    fromSecretKey: (secretKey) => {
        if (!secretKey || secretKey.length !== 32) {
            throw new Error("Secret key must be 32 bytes.");
        }
        const publicKeyBytes = getPublicKey(secretKey);
        const publicKeyInstance = new PublicKey(publicKeyBytes);
        return new KeypairImpl(publicKeyInstance, secretKey);
    }
};

export { Keypair };