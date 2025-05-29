// --- system-program.js ---
import { CteEncoder } from '@leachain/cte-core'; // Make sure this is installed
import { LEA_SYSTEM_PROGRAM } from './constants.js';

export class TransferInstruction {
    #programIndex = null;

    constructor({ fromPubkey, toPubkey, amount }) {
        this.fromPubkey = fromPubkey;
        this.toPubkey = toPubkey;
        this.amount = amount;
        this.fromPubkeyIndex = null;
        this.toPubkeyIndex = null;
    }

    resolveKeys(keyList) {
        this.#programIndex = keyList.add(LEA_SYSTEM_PROGRAM);
        this.fromPubkeyIndex = keyList.add(this.fromPubkey);
        this.toPubkeyIndex = keyList.add(this.toPubkey);
    }

    get programIndex() {
        return this.#programIndex;
    }

    async toBytes() {
        if (this.fromPubkeyIndex === null || this.toPubkeyIndex === null) {
            throw new Error("resolveKeys() must be called before toBytes()");
        }
        const encoder = await CteEncoder.create(2000);
        encoder.addIxDataUint8(0x00); // Transfer action code
        encoder.addIxDataIndexReference(this.fromPubkeyIndex);
        encoder.addIxDataUleb128(this.amount);
        encoder.addIxDataIndexReference(this.toPubkeyIndex);
        return encoder.getEncodedData();
    }
}

export class SystemProgram {
    static transfer(obj) {
        return new TransferInstruction(obj);
    }
}
