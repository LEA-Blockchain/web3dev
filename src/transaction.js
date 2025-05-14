import { CteEncoder, CTE_CRYPTO_TYPE_ED25519 } from '@leachain/cte-core';
import { KeyList, hexToBytes } from './utils.js';
import { KeypairImpl } from './keypair.js';

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
    constructor() {
        this.#keyList.add(recentBlockhashPlaceHolder); // element 0 is recent blockhash
    }

    add(instruction) {
        instruction.resolveKeys(this.#keyList);
        this.#instructions.push(instruction);
    }

    addSig(publicKey, signature) {
        const pubkeyIndex = this.#keyList.hasKey(publicKey);
        if (typeof pubkeyIndex === 'number') {
            this.#signaturesEd25519.set(pubkeyIndex, signature);
        }
        else {
            throw new Error("Public key missing for transaction signature");
        }
        if (!(signature instanceof Uint8Array) || signature.length !== 64) {
            throw new Error("Invalid Ed25519 signature: must be a Uint8Array(64)");
        }
    }

    async sign(signer) {
        if (!(signer instanceof KeypairImpl)) {
            throw new TypeError("Expected an instance of KeypairImpl");
        }
        //build transaction without signatures
        const encoder = await this.serializeWithoutSignatures();
        const unsignedTransaction = encoder.getEncodedData();
        const signature = await signer.sign(unsignedTransaction);
        this.addSig(signer.publicKey, signature);
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
        const encoder = await CteEncoder.create(2000);

        /* build a 32byte index array */
        encoder.addPublicKeyList(this.#keyList.getKeys(), CTE_CRYPTO_TYPE_ED25519);

        /* number of instruction in this transaction */
        encoder.addIxDataIndexReference(this.#instructions.length);

        const encoded = [];
        for (const ix of this.#instructions) {
            // programm index reference
            encoder.addIxDataIndexReference(ix.programIndex);
            // programm command data
            encoder.addCommandData(await ix.toBytes());
        }

        return encoder;
    }

    async toBytes() {
        const encoder = await this.serializeWithoutSignatures();
        /* Add any signatures we maybe have set */
        if (this.#signaturesEd25519.size > 0) {
            for (const [pubkeyIndex, signature] of this.#signaturesEd25519.entries()) {
                encoder.addSignatureList([signature], CTE_CRYPTO_TYPE_ED25519);
                encoder.addIxDataIndexReference(pubkeyIndex)
            }
        }

        return encoder.getEncodedData();
    }
}
