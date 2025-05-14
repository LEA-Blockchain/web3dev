import { verify } from '@noble/ed25519'; // Import the verify function
import { encode as bech32mEncode, decode as bech32mDecode } from './bech32m.js';
import { ADDRESS_HRP } from './constants.js';

export class PublicKey {
    #bytes;

    constructor(value) {
        if (typeof value === 'string') {
            try {
                const decoded = bech32mDecode(ADDRESS_HRP, value);
                this.#bytes = Uint8Array.from(decoded.dataBytes);
            } catch (e) {
                let errorMessage = "Invalid Bech32m address format";
                if (e instanceof Error) {
                    errorMessage += `: ${value}. ${e.message}`;
                } else {
                    errorMessage += `: ${value}. An unknown error occurred during decoding.`;
                }
                throw new Error(errorMessage);
            }
        } else if (value instanceof Uint8Array) {
            if (value.length !== 32) {
                throw new Error(`Public key bytes must be 32 bytes long, received ${value.length}`);
            }
            this.#bytes = Uint8Array.from(value);
        } else {
            throw new Error("Invalid input type for PublicKey constructor. Must be Uint8Array or Bech32m string.");
        }
    }

    async verify(message, signature) {
        try {
            const isValid = await verify(signature, message, this.#bytes);
            return isValid;
        } catch (error) {
            console.error("Signature verification failed:", error);
            return false;
        }
    }

    toBytes() {
        return Uint8Array.from(this.#bytes);
    }

    toString() {
        try {
            return bech32mEncode(ADDRESS_HRP, this.#bytes);
        } catch (error) {
            console.error("PublicKey Bech32m encoding failed:", error);
            throw new Error("Failed to encode public key as Bech32m.");
        }
    }

    equals(other) {
        if (!other || typeof other.toBytes !== 'function') {
            return false;
        }
        const otherBytes = other.toBytes();
        if (this.#bytes.length !== otherBytes.length) {
            return false;
        }
        for (let i = 0; i < this.#bytes.length; i++) {
            if (this.#bytes[i] !== otherBytes[i]) {
                return false;
            }
        }
        return true;
    }
}

//export const PublicKey = (publicKey) => {
//    return new PublicKeyImpl(publicKey);
//};