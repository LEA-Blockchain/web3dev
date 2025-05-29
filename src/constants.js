/**
 * Defines constants used throughout the Lea blockchain library.
 */

/**
 * The SLIP-0044 coin type assigned to the Lea blockchain.
 * This is used in BIP-44 derivation paths (m/44'/COIN_TYPE'/...).
 * Make sure this is the officially registered or chosen number for your chain.
 * Remember that hardened derivation (apostrophe ') is required by SLIP-0010 for Ed25519 keys.
 * Example value used: 2323
 */
export const LEA_COIN_TYPE = 2323;

/**
 * Default derivation path structure base for accounts (SLIP-0010 compatible).
 * Example: "m/44'/COIN_TYPE'" - The account index will be appended.
 */
export const DEFAULT_ACCOUNT_DERIVATION_BASE = `m/44'/${LEA_COIN_TYPE}'`;

/**
 * Default Bech32m Human-Readable Part (HRP) for Lea addresses.
 * Example: 'lea'
 */
export const ADDRESS_HRP = 'lea';

// Add other constants as needed:
// export const DEFAULT_RPC_ENDPOINT = 'http://localhost:8899';
// export const NETWORK_ID = 'lea-mainnet';
// export const WS_ENDPOINT = 'ws://localhost:8900';

export const LEA_SYSTEM_PROGRAM = new Uint8Array([
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255
]);
