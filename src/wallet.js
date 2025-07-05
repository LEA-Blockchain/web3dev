import { HDKey } from './hd.js';
import { mnemonicToSeed } from './bip39.js';
import { Keypair } from './keypair.js';
import { SLHKeypair } from './slh-keypair.js';
import { ED25519_DERIVATION_BASE, SLHDSA_DERIVATION_BASE, ADDRESS_BYTE_LENGTH, ADDRESS_HRP } from './constants.js';
import { createBLAKE3 } from "hash-wasm";
import { Address } from './address.js';

export class WalletImpl {
    #masterKey;

    constructor(masterKey) {
        if (!(masterKey instanceof HDKey)) {
            throw new Error("Invalid masterKey provided.");
        }
        this.#masterKey = masterKey;
    }

    /** Derives an Ed25519 Keypair using a BIP-44 path. */
    deriveAccountEdDsa(index) {
        try {
            const derivedHDKey = this.#masterKey.derive(`${ED25519_DERIVATION_BASE}/${index}'`);
            return Keypair.fromSecretKey(derivedHDKey.privateKey);
        } catch (error) {
            throw new Error(`Failed to derive EdDSA account for path ${index}: ${error.message}`);
        }
    }

    /**
     * Derives a post-quantum (SLH-DSA) Keypair.
     * @param {number} index - The hardened account index (e.g., 0, 1, 2...).
     */
    async getAccountSlhDsa(index) {
        if (typeof index !== 'number' || index < 0 || !Number.isInteger(index)) {
            throw new Error("Account index must be a non-negative integer.");
        }

        // SLIP-0010 derivation for SLH-DSA uses a distinct purpose code (211').
        const path = `${SLHDSA_DERIVATION_BASE}/${index}'`;
        try {
            const derivedHDKey = this.#masterKey.derive(path);
            const pqcSeed = derivedHDKey.privateKey;
            return await SLHKeypair.fromSecretKey(pqcSeed);
        } catch (error) {
            throw new Error(`Failed to derive SLH-DSA account for path ${path}: ${error.message}`);
        }
    }

    /**
     * Creates a full account, including EdDSA and post-quantum SLH-DSA keys,
    * and derives a unified address from both public keys.
    * @param {number} index - The hardened account index (e.g., 0, 1, 2...).
    */
    async getAccount(index) {
        if (typeof index !== 'number' || index < 0 || !Number.isInteger(index)) {
            throw new Error("Account index must be a non-negative integer.");
        }

        const edDsa = this.deriveAccountEdDsa(index);
        const slhDsa = await this.getAccountSlhDsa(index);

        const edPublicKeyBytes = edDsa.publicKey.toBytes();
        const slhPublicKeyBytes = slhDsa.publicKey.toBytes();

        // The address is the BLAKE3 hash of the concatenated EdDSA and SLH-DSA public keys.
        const blake3Hasher = await createBLAKE3(ADDRESS_BYTE_LENGTH * 8);
        blake3Hasher.update(edPublicKeyBytes);
        blake3Hasher.update(slhPublicKeyBytes);
        const publicKeyPairHash = blake3Hasher.digest('binary');
        const address = new Address(publicKeyPairHash);

        return {
            edDsa,
            slhDsa,
            publicKeyPairHash,
            address
        };
    }

    /**
     * Exports the raw Ed25519 private key for an account. Use with caution.
     * @param {number} index - The hardened account index.
     */
    exportPrivateKey(index) {
        if (typeof index !== 'number' || index < 0 || !Number.isInteger(index)) {
            throw new Error("Account index must be a non-negative integer.");
        }

        const path = `${ED25519_DERIVATION_BASE}/${index}'`;
        try {
            const derivedHDKey = this.#masterKey.derive(path);
            return Uint8Array.from(derivedHDKey.privateKey);
        } catch (error) {
            throw new Error(`Failed to export private key for index ${index}: ${error.message}`);
        }
    }
}

/** Factory for creating Wallet instances. */
export const Wallet = {
    /**
     * Creates a wallet from a BIP-39 mnemonic phrase.
     * @param {string} mnemonic - The seed phrase.
     * @param {string} [passphrase] - Optional BIP-39 passphrase.
     */
    fromMnemonic: (mnemonic, passphrase) => {
        const seed = mnemonicToSeed(mnemonic, passphrase);
        const masterKey = HDKey.fromMasterSeed(seed);
        return new WalletImpl(masterKey);
    },
};