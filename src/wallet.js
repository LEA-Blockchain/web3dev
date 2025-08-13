import { HDKey } from './hd.js';
import { mnemonicToSeed } from './bip39.js';
import { LEA_DERIVATION_BASE, ADDRESS_BYTE_LENGTH, ADDRESS_HRP } from './constants.js';
import { generateKeyset } from '@leachain/keygen';

export class WalletImpl {
    #hdKey;

    constructor(hdKey) {
        if (!(hdKey instanceof HDKey)) {
            console.error("Invalid masterKey:", hdKey);
            throw new Error("Invalid masterKey: must be an instance of HDKey.");
        }
        this.#hdKey = hdKey;
    }

    /** Derives an keyset using a BIP-44 path. */
    async deriveAccount(index) {
        try {
            const derivedKey = await this.#hdKey.derive(`${LEA_DERIVATION_BASE}/${index}'`);
            return await generateKeyset(derivedKey);
        } catch (error) {
            throw new Error(`Failed to derive account for path ${index}: ${error.message}`);
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

        const { keyset, address } = await this.deriveAccount(index);

        return {
            keyset,
            address,
        };
    }

}

/** Factory for creating Wallet instances. */
export const Wallet = {
    /**
     * Creates a wallet from a BIP-39 mnemonic phrase.
     * @param {string} mnemonic - The seed phrase.
     * @param {string} [passphrase] - Optional BIP-39 passphrase.
     */
    fromMnemonic: async (mnemonic, passphrase) => {
        const seed = await mnemonicToSeed(mnemonic, passphrase);
        const masterKey = await HDKey.fromMasterSeed(seed);
        return new WalletImpl(masterKey);
    },
};