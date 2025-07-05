import { SctpEncoder } from '@leachain/sctp';
import { KeyList, hexToBytes, combineUint8Arrays } from './utils.js';
//import { KeypairImpl } from './keypair.js';
//import { SLHKeypairImpl } from './slh-keypair.js';
import { SLHPublicKey } from './slh-public.js';
import { PublicKey } from './publickey.js';
import { createBLAKE3 } from "hash-wasm";
import { Address } from './address.js';
const recentBlockhashPlaceHolder = new Uint8Array([
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0
]);

export class Transaction {
    #keyList = new KeyList();
    #instructions = [];
    #signaturesEd25519 = new Map();
    #signaturesSLHDSA = new Map();
    constructor() {
        this.#keyList.add(recentBlockhashPlaceHolder); // element 0 is recent blockhash
    }

    add(instruction) {
        instruction.resolveKeys(this.#keyList);
        this.#instructions.push(instruction);
    }

    addEdDsaSig(publicKey, signature) {
        const pubkeyIndex = this.#keyList.hasKey(publicKey);
        if (!(signature instanceof Uint8Array)) {
            throw new Error("Invalid signature: must be a Uint8Array");
        }
        if (typeof pubkeyIndex === 'number') {
            this.#signaturesEd25519.set(pubkeyIndex, signature);
        }
        else {
            throw new Error("Address missing for transaction signature");
        }
    }

    addSlhDsaSig(address, signature) {
        const pubkeyIndex = this.#keyList.hasKey(address);
        if (!(signature instanceof Uint8Array)) {
            throw new Error("Invalid signature: must be a Uint8Array");
        }
        if (typeof pubkeyIndex === 'number') {
            this.#signaturesSLHDSA.set(pubkeyIndex, signature);
        } else {
            throw new Error("Signer address missing for transaction signature");
        }
    }

    async sign(signer) {
        // Ensure the signer's keypair hash is in the keyList
        if (this.#keyList.hasKey(signer.address) === undefined) {
            this.#keyList.add(signer.address);
        }

        //build transaction without signatures
        const encoder = await this.serializeWithoutSignatures();
        const unsignedTransaction = encoder.build();
        const edDsaSignature = await signer.edDsa.sign(unsignedTransaction);
        this.addEdDsaSig(signer.address, edDsaSignature);
        //We will return the hash of the slh signature
        const slhDsaSignature = await signer.slhDsa.sign(unsignedTransaction);
        const blake3Hasher = await createBLAKE3();
        blake3Hasher.update(slhDsaSignature);
        const slhDsaSignatureHash = blake3Hasher.digest('binary');
        this.addSlhDsaSig(signer.address, slhDsaSignatureHash);
    }

    set recentBlockhash(blockHash) {
        if (typeof blockHash === 'string') {
            this.#keyList._keys[0] = hexToBytes(blockHash);
        } else if (blockHash instanceof Uint8Array) {
            this.#keyList._keys[0] = blockHash;
        } else {
            throw new Error("Invalid blockHash: must be a hex string or Uint8Array");
        }
    }

    async serializeWithoutSignatures() {
        /* build transaction */
        const encoder = await SctpEncoder();
        encoder.init(2000);

        const keys = this.#keyList.getKeys();
        const rawKeys = keys.map(key => {
            if (key instanceof PublicKey || key instanceof SLHPublicKey) {
                return key.toBytes();
            }
            if (key instanceof Address) {
                return key.publicKeyPairHash;
            }
            return key;
        });

        /* build a 32byte index array */
        encoder.addVector(combineUint8Arrays(rawKeys));
        /* number of instruction in this transaction */
        encoder.addShort(this.#instructions.length);

        const encoded = [];
        for (const ix of this.#instructions) {
            // programm index reference
            encoder.addShort(ix.programIndex);
            // programm command data
            encoder.addVector(await ix.toBytes());
        }

        return encoder;
    }

    async toBytes() {
        const encoder = await this.serializeWithoutSignatures();
        /* Add any signatures we maybe have set */
        if (this.#signaturesEd25519.size > 0) {
            for (const [pubkeyIndex, signature] of this.#signaturesEd25519.entries()) {
                encoder.addVector(signature);
                encoder.addShort(pubkeyIndex);
            }
        }
        if (this.#signaturesSLHDSA.size > 0) {
            for (const [pubkeyIndex, signature] of this.#signaturesSLHDSA.entries()) {
                encoder.addVector(signature);
                encoder.addShort(pubkeyIndex);
            }
        }

        return encoder.build();
    }
}
