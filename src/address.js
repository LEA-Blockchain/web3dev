import { encode as bech32mEncode, decode as bech32mDecode } from './bech32m.js';
import { ADDRESS_HRP, ADDRESS_BYTE_LENGTH } from './constants.js';

export class Address {
    constructor(addressX) {
        if (typeof addressX === 'string') {
            try {
                this.publicKeyPairHash = bech32mDecode(ADDRESS_HRP, addressX);
            } catch (e) {
                throw new Error(`Invalid Bech32m address format: ${addressX}. ${e.message}`);
            }
        }
        else if (addressX instanceof Uint8Array) {
            this.publicKeyPairHash = addressX;
        }
        else {
            throw new Error("Invalid input type for Address constructor. Must be a Uint8Array or a Bech32m string.");
        }

        // --- Common validation for both paths ---
        if (this.publicKeyPairHash.length !== ADDRESS_BYTE_LENGTH) {
            throw new Error(`Public key hash bytes must be ${ADDRESS_BYTE_LENGTH} bytes long, received ${this.publicKeyPairHash.length}`);
        }
    }

    toString() {
        try {
            return bech32mEncode(ADDRESS_HRP, this.publicKeyPairHash);
        }
        catch (e) {
            throw new Error(`Failed to encode public key pair hash to Bech32m: ${e.message}`);
        }
    }

    toBytes() {
        return this.publicKeyPairHash;
    }
}