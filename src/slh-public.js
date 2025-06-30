import { slh_dsa_sha2_256s as algorithm } from '@noble/post-quantum/slh-dsa';
import { encode as bech32mEncode, decode as bech32mDecode } from './bech32m.js';
import { sha256 } from '@noble/hashes/sha256';
import { ADDRESS_HRP } from './constants.js';

// The @noble/post-quantum library does not expose key lengths directly.
// We are hardcoding the public key length for slh_dsa_sha2_256f and slh_dsa_sha2_256s
// which is 64 bytes.
const SLH_PUBLIC_KEY_LEN = 64;

export class SLHPublicKey {
  #bytes;

  constructor(value) {
    if (typeof value === 'string') {
      // Bech32m addresses are hashes, not valid full public keys
      const decoded = bech32mDecode(ADDRESS_HRP, value);
      throw new Error("SLH public key must be constructed from raw bytes, not an address.");
    } else if (value instanceof Uint8Array) {
      if (value.length !== SLH_PUBLIC_KEY_LEN) {
        throw new Error(`SLH-DSA public key must be ${SLH_PUBLIC_KEY_LEN} bytes`);
      }
      this.#bytes = Uint8Array.from(value);
    } else {
      throw new Error("Invalid input: expected Uint8Array");
    }
  }

  // Verifies a signature using the internal public key bytes
  async verify(message, signature) {
    return await algorithm.verify(this.#bytes, message, signature);
  }

  // Returns the raw public key bytes
  toBytes() {
    return Uint8Array.from(this.#bytes);
  }

  /**
   * Returns a Bech32m-encoded address derived from a SHA-256 hash of the public key.
   * This avoids exposing large post-quantum keys directly in address format.
   */
  toString() {
    const hash = sha256(this.#bytes);
    return bech32mEncode(ADDRESS_HRP, hash);
  }

  // Compares this key with another by byte equality
  equals(other) {
    if (!other || typeof other.toBytes !== 'function') return false;
    const otherBytes = other.toBytes();
    if (this.#bytes.length !== otherBytes.length) return false;
    for (let i = 0; i < this.#bytes.length; i++) {
      if (this.#bytes[i] !== otherBytes[i]) return false;
    }
    return true;
  }
}
