// --- system-program.js ---
//import { SctpEncoder } from '@leachain/sctp';

import { LEA_SYSTEM_PROGRAM } from './constants.js';
/*
export class TransferInstruction {
    #programIndex = null;

    constructor({ fromPubkeyPairHash, toPubkeyPairHash, amount }) {
        this.fromPubkeyPairHash = fromPubkeyPairHash;
        console.log(`TransferInstruction fromPubkeyPairHash:`, fromPubkeyPairHash);
        this.toPubkeyPairHash = toPubkeyPairHash;
        this.amount = amount;
        this.fromPubkeyIndex = null;
        this.toPubkeyIndex = null;
    }

    resolveKeys(keyList) {
        this.#programIndex = keyList.add(LEA_SYSTEM_PROGRAM);
        this.fromPubkeyIndex = keyList.add(this.fromPubkeyPairHash);
        this.toPubkeyIndex = keyList.add(this.toPubkeyPairHash);
    }

    get programIndex() {
        return this.#programIndex;
    }

    async toBytes() {
        if (this.fromPubkeyIndex === null || this.toPubkeyIndex === null) {
            throw new Error("resolveKeys() must be called before toBytes()");
        }
        const encoder = await SctpEncoder();
        encoder.init(2000);
        encoder.addUint8(0x00); // Transfer action code
        encoder.addShort(this.fromPubkeyIndex);
        encoder.addUleb128(this.amount);
        encoder.addShort(this.toPubkeyIndex);
        return encoder.build();
    }
}
//accountPubKeyHash should alsways be a object of type Address
export class PublishKeyPairInstruction {
    #programIndex = null;

    constructor({ address, slhPubKey, eddsaPubKey }) {
        this.accountPubKeyHash = address.toBytes();
        this.slhPubKey = slhPubKey;
        this.eddsaPubKey = eddsaPubKey;
        this.accountPubKeyIndex = null;
    }

    resolveKeys(keyList) {
        this.#programIndex = keyList.add(LEA_SYSTEM_PROGRAM);
        this.accountPubKeyIndex = keyList.add(this.accountPubKeyHash);
    }

    get programIndex() {
        return this.#programIndex;
    }

    async toBytes() {
        if (this.accountPubKeyIndex === null) {
            throw new Error("resolveKeys() must be called before toBytes()");
        }
        const encoder = await SctpEncoder();
        encoder.init(2000);
        encoder.addUint8(0x01); // Publish Key Pair action code
        encoder.addShort(this.accountPubKeyIndex);
        encoder.addVector(this.eddsaPubKey);
        encoder.addVector(this.slhPubKey);
        return encoder.build();
    }
}

export class RevokeKeyPairInstruction {
    #programIndex = null;

    constructor({ address }) {
        this.accountPubKeyHash = address.toBytes();
        this.accountPubKeyIndex = null;
    }

    resolveKeys(keyList) {
        this.#programIndex = keyList.add(LEA_SYSTEM_PROGRAM);
        this.accountPubKeyIndex = keyList.add(this.accountPubKeyHash);
    }

    get programIndex() {
        return this.#programIndex;
    }

    async toBytes() {
        if (this.accountPubKeyIndex === null) {
            throw new Error("resolveKeys() must be called before toBytes()");
        }
        const encoder = await SctpEncoder.create();
        encoder.init(2000);
        encoder.addUint8(0x02); // Revoke Key Pair action code
        encoder.addShort(this.accountPubKeyIndex);
        return encoder.build();
    }
}

export class SystemProgram {
    static transfer(obj) {
        return new TransferInstruction(obj);
    }

    static publishKeyPair(obj) {
        return new PublishKeyPairInstruction(obj);
    }

    static revokeKeyPair(obj) {
        return new RevokeKeyPairInstruction(obj);
    }
}
*/