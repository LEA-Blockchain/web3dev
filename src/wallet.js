import { HDKey } from './hd.js';
import { mnemonicToSeed } from './bip39.js'
import { Keypair } from './keypair.js';
import { DEFAULT_ACCOUNT_DERIVATION_BASE } from './constants.js';


/**
 * Implements the Wallet interface for managing HD keys using @scure/bip39.
 * @implements {WalletDef}
 */
class WalletImpl {
    /**
     * The master HDKey derived from the seed.
     * @type {HDKey}
     */
    #masterKey;

    /**
     * Creates an instance of WalletImpl. Use Wallet.fromMnemonic.
     * @param {HDKey} masterKey - The master HDKey object.
     * @hideconstructor
     */
    constructor(masterKey) {
        if (!(masterKey instanceof HDKey)) {
            throw new Error("Invalid masterKey provided to WalletImpl constructor.");
        }
        this.#masterKey = masterKey;
    }

    /**
     * Derives a Keypair using a BIP-44 derivation path string.
     * @param {string} path - The derivation path (e.g., "m/44'/2323'/0'/0'").
     * @returns {KeypairDef} The derived Keypair.
     * @throws {Error} if the path is invalid or derivation fails.
     */
    deriveAccount(path) {
        try {
            const derivedHDKey = this.#masterKey.derive(path);
            // Assumes Keypair.fromSecretKey handles public key derivation
            return Keypair.fromSecretKey(derivedHDKey.privateKey);
        } catch (error) {
            console.error(`Error deriving account for path ${path}:`, error);
            throw new Error(`Failed to derive account for path ${path}.`);
        }
    }

    /**
     * Derives a Keypair using a simple account index based on SLIP-0010 pattern.
     * Uses the path `m/44'/COIN_TYPE'/{index}'`. Index MUST be hardened.
     * @param {number} index - The account index (e.g., 0, 1, 2...).
     * @returns {KeypairDef} The derived Keypair.
     * @throws {Error} if the index is invalid or derivation fails.
     */
    getAccount(index) {
        if (typeof index !== 'number' || index < 0 || !Number.isInteger(index)) {
            throw new Error("Account index must be a non-negative integer.");
        }
        const path = `${DEFAULT_ACCOUNT_DERIVATION_BASE}/${index}'`;
        return this.deriveAccount(path);
    }

    /**
     * Exports the raw private key for a derived account at a specific index.
     * Uses the path `m/44'/COIN_TYPE'/{index}'`. Index MUST be hardened.
     * Use with extreme caution.
     * @param {number} index - The account index.
     * @returns {Uint8Array} The raw private key (secret key) as a byte array.
     * @throws {Error} if the index is invalid or derivation fails.
     */
    exportPrivateKey(index) {
        if (typeof index !== 'number' || index < 0 || !Number.isInteger(index)) {
            throw new Error("Account index must be a non-negative integer.");
        }
        const path = `${DEFAULT_ACCOUNT_DERIVATION_BASE}/${index}'`;
        try {
            const derivedHDKey = this.#masterKey.derive(path);
            // Return a copy of the private key (seed part)
            return Uint8Array.from(derivedHDKey.privateKey);
        } catch (error) {
            console.error(`Error exporting private key for index ${index}:`, error);
            throw new Error(`Failed to export private key for index ${index}.`);
        }
    }
}

/**
 * Static methods for creating Wallet instances using @scure/bip39.
 * Matches the WalletConstructor interface shape.
 * @type {WalletConstructorDef}
 */
const Wallet = {
    /**
     * Creates a Wallet instance from a BIP-39 mnemonic phrase using @scure/bip39.
     * Uses synchronous seed generation.
     * @param {string} mnemonic - The seed phrase.
     * @param {string} [passphrase] - (Optional) BIP-39 passphrase.
     * @returns {WalletDef} A new Wallet instance.
     * @throws {Error} if the mnemonic is invalid according to the English wordlist.
     */
    fromMnemonic: (mnemonic, passphrase) => {
        // Validate using @scure/bip39 and the explicitly imported English wordlist
        const seed = mnemonicToSeed(mnemonic, passphrase);

        // Create the master HD key from the seed
        const masterKey = HDKey.fromMasterSeed(seed);

        // Return the Wallet implementation instance
        return new WalletImpl(masterKey);
    },
};

// Export the Wallet object containing the static methods using named export
export { Wallet };