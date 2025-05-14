import { utf8ToBytes, bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils';

/**
 * Checks if two Uint8Array instances are equal.
 * @param {Uint8Array | undefined | null} a - The first Uint8Array.
 * @param {Uint8Array | undefined | null} b - The second Uint8Array.
 * @returns {boolean} True if the arrays are equal, false otherwise.
 */
function areUint8ArraysEqual(a, b) {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length || !(a instanceof Uint8Array) || !(b instanceof Uint8Array)) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

class KeyList {
    _keys = []; // You are using a mix of conventions: _keys (older private convention) and #count/#maxSize (JS private fields)
    #count = 0;
    #maxSize;

    /**
     * Creates an instance of KeyList.
     * @param {number} [maxSize=15] - The maximum number of keys the list can hold.
     */
    constructor(maxSize = 15) {
        if (typeof maxSize !== 'number' || maxSize <= 0) {
            throw new Error('KeyList: maxSize must be a positive number.');
        }
        this.#maxSize = maxSize;
    }

    /**
     * Resolves a key input into a Uint8Array.
     * @param {Uint8Array | { toBytes: () => Uint8Array } | any} key - The key to resolve.
     * @returns {Uint8Array} The resolved key as a Uint8Array.
     * @throws {Error} If the key is invalid or not a 32-byte Uint8Array.
     * @private
     */
    #resolveKey(key) {
        let bytes = null;

        if (key instanceof Uint8Array) {
            bytes = key;
        } else if (key && typeof key.toBytes === 'function') {
            bytes = key.toBytes();
        }

        if (!(bytes instanceof Uint8Array)) {
            throw new Error("KeyList: Invalid key type. Key must be a Uint8Array or an object with a .toBytes() method that returns a Uint8Array.");
        }
        if (bytes.length !== 32) {
            throw new Error("KeyList: Key must be a 32-byte Uint8Array.");
        }

        return bytes;
    }

    /**
     * Adds a key to the list.
     * If the key already exists, its index is returned.
     * @param {Uint8Array | { toBytes: () => Uint8Array }} key - The key to add.
     * @returns {number} The index of the added or existing key.
     * @throws {Error} If the list is at maximum capacity.
     */
    add(key) {
        const bytes = this.#resolveKey(key);

        // Check if key already exists
        for (let i = 0; i < this.#count; i++) {
            if (areUint8ArraysEqual(bytes, this._keys[i])) {
                return i; // Key already exists, return its index
            }
        }

        if (this.#count >= this.#maxSize) {
            throw new Error(`KeyList: Cannot add key, maximum capacity (${this.#maxSize}) reached.`);
        }

        this._keys[this.#count] = bytes;
        return this.#count++;
    }

    /**
     * Checks if a key exists in the list and returns its index if found.
     * @param {Uint8Array | { toBytes: () => Uint8Array }} key - The key to check.
     * @returns {number | false} The index of the key if found, otherwise false.
     */
    hasKey(key) {
        try {
            const bytesToFind = this.#resolveKey(key);
            for (let i = 0; i < this.#count; i++) {
                // Ensure you are comparing against the correct array `this._keys`
                if (areUint8ArraysEqual(bytesToFind, this._keys[i])) {
                    return i; // Return the index if found
                }
            }
        } catch (error) {
            // As per your original code, log a warning if key resolution fails.
            // Depending on desired behavior, you might want to re-throw or handle differently.
            console.warn("KeyList.hasKey: Could not resolve key:", error.message);
            return false; // Key is invalid or resolution failed
        }
        return false; // Key not found
    }

    /**
     * Gets a shallow copy of the keys currently in the list.
     * @returns {Uint8Array[]} An array of Uint8Array keys.
     */
    getKeys() {
        // Ensure you are slicing the correct array `this._keys`
        return this._keys.slice(0, this.#count);
    }

    /**
     * Gets the current number of keys in the list.
     * @returns {number}
     */
    get count() {
        return this.#count;
    }

    /**
     * Gets the maximum capacity of the list.
     * @returns {number}
     */
    get maxSize() {
        return this.#maxSize;
    }
}

// Export the necessary functions and the class
export { utf8ToBytes, bytesToHex, hexToBytes, randomBytes, KeyList, areUint8ArraysEqual };