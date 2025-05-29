// transactionDecoder.js

// Core CTE library imports
import { CteDecoder, CteEncoder, CTE_TAG_PUBLIC_KEY_LIST, CTE_TAG_IXDATA_FIELD, CTE_TAG_COMMAND_DATA, CTE_TAG_SIGNATURE_LIST, CTE_CRYPTO_TYPE_ED25519, CTE_PUBKEY_SIZE_ED25519 } from '@leachain/cte-core';

// Imports from your lea-wallet library (adjust paths if necessary)
import { PublicKey } from './publickey.js';
import { bytesToHex } from './index.js';

// LEA_SYSTEM_PROGRAM_ID definition (from your system-program.js)
const LEA_SYSTEM_PROGRAM_ID_BYTES = new Uint8Array([
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255, 255, 255, 255, 255
]);
const LEA_SYSTEM_PROGRAM_ID = new PublicKey(LEA_SYSTEM_PROGRAM_ID_BYTES);

/**
 * Decodes the commandData of a SystemProgram transfer instruction.
 * @param {Uint8Array} commandData - The raw command data for the instruction.
 * @param {PublicKey[]} keyList - The list of public keys from the transaction's keyList.
 * @returns {Promise<{fromPubkey: PublicKey, toPubkey: PublicKey, amount: bigint}>}
 * @throws {Error} if decoding fails.
 */
async function decodeSystemProgramTransferInstruction(commandData, keyList) {
    const instructionDecoder = await CteDecoder.create(commandData);
    let decodedInstructionData;
    try {
        if (instructionDecoder.peekTag() !== CTE_TAG_IXDATA_FIELD) {
            throw new Error("SystemProgram Transfer: Expected action code (IxData).");
        }
        const actionCode = instructionDecoder.readIxDataUint8();
        if (actionCode !== 0x00) {
            throw new Error(`SystemProgram Transfer: Unexpected action code ${actionCode}. Expected 0.`);
        }

        if (instructionDecoder.peekTag() !== CTE_TAG_IXDATA_FIELD) {
            throw new Error("SystemProgram Transfer: Expected fromPubkey index (IxData).");
        }
        const fromIndex = instructionDecoder.readIxDataIndexReference();

        if (instructionDecoder.peekTag() !== CTE_TAG_IXDATA_FIELD) {
            throw new Error("SystemProgram Transfer: Expected amount (IxData ULEB128).");
        }
        const amount = instructionDecoder.readIxDataUleb128();

        if (instructionDecoder.peekTag() !== CTE_TAG_IXDATA_FIELD) {
            throw new Error("SystemProgram Transfer: Expected toPubkey index (IxData).");
        }
        const toIndex = instructionDecoder.readIxDataIndexReference();

        if (fromIndex >= keyList.length || toIndex >= keyList.length) {
            throw new Error(`SystemProgram Transfer: Invalid key index. FromIndex: ${fromIndex}, ToIndex: ${toIndex}, KeyList length: ${keyList.length}`);
        }

        if (instructionDecoder.peekTag() !== null) {
            console.warn("SystemProgram Transfer: Trailing data found in instruction commandData.");
        }

        decodedInstructionData = {
            fromPubkey: keyList[fromIndex], // PublicKey object
            toPubkey: keyList[toIndex],     // PublicKey object
            amount: amount,
        };
    } finally {
        instructionDecoder.destroy();
    }
    return decodedInstructionData;
}


/**
 * Decodes a serialized CTE transaction.
 * @param {Uint8Array} encodedBytes - The raw bytes of the signed transaction.
 * @returns {Promise<Object>} An object containing the decoded transaction details.
 * @throws {Error} If decoding fails at any critical step.
 */
export async function decodeTransaction(encodedBytes) {
    if (!(encodedBytes instanceof Uint8Array)) {
        throw new TypeError("encodedBytes must be a Uint8Array.");
    }

    const decoder = await CteDecoder.create(encodedBytes);
    const decodedTx = {
        recentBlockhash: null, // This will be a hex string
        keyList: [],
        rawKeyListBytes: [],
        instructions: [],
        signatures: [],
        rawUnsignedDataForVerification: null,
    };

    let unsignedDataEncoder;

    try {
        // 1. Read Public Key List
        if (decoder.peekTag() !== CTE_TAG_PUBLIC_KEY_LIST) {
            throw new Error("Transaction does not start with a Public Key List.");
        }
        const pkListInfo = decoder.peekPublicKeyListInfo();
        if (!pkListInfo) {
            throw new Error("Failed to peek Public Key List info.");
        }
        if (pkListInfo.typeCode !== CTE_CRYPTO_TYPE_ED25519) {
            throw new Error(`Expected Ed25519 public key list (type ${CTE_CRYPTO_TYPE_ED25519}), got ${pkListInfo.typeCode}.`);
        }
        const publicKeyData = decoder.readPublicKeyListData();
        if (!publicKeyData) {
            throw new Error("Failed to read Public Key List data.");
        }

        for (let i = 0; i < publicKeyData.length; i += CTE_PUBKEY_SIZE_ED25519) {
            decodedTx.rawKeyListBytes.push(publicKeyData.slice(i, i + CTE_PUBKEY_SIZE_ED25519));
        }
        decodedTx.keyList = decodedTx.rawKeyListBytes.map(pkBytes => new PublicKey(pkBytes));

        if (decodedTx.rawKeyListBytes.length > 0 && decodedTx.rawKeyListBytes[0]) {
            decodedTx.recentBlockhash = bytesToHex(decodedTx.rawKeyListBytes[0]);
        } else {
            throw new Error("Public key list is empty or first element is invalid, cannot determine recentBlockhash.");
        }

        unsignedDataEncoder = await CteEncoder.create(encodedBytes.length + 512);
        unsignedDataEncoder.addPublicKeyList(decodedTx.rawKeyListBytes, CTE_CRYPTO_TYPE_ED25519);

        // 2. Read Number of Instructions
        if (decoder.peekTag() !== CTE_TAG_IXDATA_FIELD) {
            throw new Error("Expected instruction count (IxData) after public key list.");
        }
        const numInstructions = decoder.readIxDataIndexReference();
        unsignedDataEncoder.addIxDataIndexReference(numInstructions);

        // 3. Read Instructions
        for (let i = 0; i < numInstructions; i++) {
            if (decoder.peekTag() !== CTE_TAG_IXDATA_FIELD) {
                throw new Error(`Expected program index (IxData) for instruction ${i}.`);
            }
            const programIndexInKeyList = decoder.readIxDataIndexReference();
            unsignedDataEncoder.addIxDataIndexReference(programIndexInKeyList);

            // **FIX**: Validate programIndexInKeyList before use
            if (programIndexInKeyList >= decodedTx.keyList.length || programIndexInKeyList < 0) {
                throw new Error(`Invalid programIndexInKeyList ${programIndexInKeyList} for instruction ${i}. KeyList length: ${decodedTx.keyList.length}`);
            }

            const programIdBytes = decodedTx.rawKeyListBytes[programIndexInKeyList];
            if (!programIdBytes) { // Should not happen if index is validated, but good for safety
                throw new Error(`Program ID bytes not found at index ${programIndexInKeyList} for instruction ${i}.`);
            }


            if (decoder.peekTag() !== CTE_TAG_COMMAND_DATA) {
                throw new Error(`Expected command data for instruction ${i}.`);
            }
            const commandDataPayloadObj = decoder.readCommandDataPayload();
            if (!commandDataPayloadObj) {
                throw new Error(`Failed to read command data payload for instruction ${i}.`);
            }
            const commandData = commandDataPayloadObj.data;
            unsignedDataEncoder.addCommandData(commandData);

            const currentProgramIdObject = decodedTx.keyList[programIndexInKeyList]; // Now this access is safer

            const instruction = {
                programId: bytesToHex(programIdBytes),
                programIndexInKeyList: programIndexInKeyList,
                rawData: commandData,
                type: 'unknown',
            };

            if (currentProgramIdObject && currentProgramIdObject.equals(LEA_SYSTEM_PROGRAM_ID)) {
                try {
                    const parsedDetails = await decodeSystemProgramTransferInstruction(commandData, decodedTx.keyList);
                    instruction.type = 'transfer';
                    instruction.fromPubkey = parsedDetails.fromPubkey;
                    instruction.toPubkey = parsedDetails.toPubkey;
                    instruction.amount = parsedDetails.amount;
                } catch (e) {
                    instruction.type = 'system_program_parse_error';
                    instruction.parseError = e.message;
                }
            }
            decodedTx.instructions.push(instruction);
        }

        decodedTx.rawUnsignedDataForVerification = unsignedDataEncoder.getEncodedData();

        // 4. Read Signatures and Validate
        while (decoder.peekTag() === CTE_TAG_SIGNATURE_LIST) {
            const sigListInfo = decoder.peekSignatureListInfo();
            if (!sigListInfo) {
                throw new Error("Failed to peek Signature List info.");
            }
            if (sigListInfo.typeCode !== CTE_CRYPTO_TYPE_ED25519 || sigListInfo.count !== 1) {
                throw new Error(`Invalid signature block format. Expected single Ed25519 signature (type ${CTE_CRYPTO_TYPE_ED25519}, count 1), got type ${sigListInfo.typeCode}, count ${sigListInfo.count}.`);
            }
            const signatureBytes = decoder.readSignatureListData();
            if (!signatureBytes) {
                throw new Error("Failed to read Signature List data.");
            }

            if (decoder.peekTag() !== CTE_TAG_IXDATA_FIELD) {
                throw new Error("Expected signer public key index (IxData) after signature.");
            }
            const signerPubkeyIndex = decoder.readIxDataIndexReference();
            if (signerPubkeyIndex >= decodedTx.keyList.length || signerPubkeyIndex < 0) { // Added lower bound check
                throw new Error(`Invalid signer public key index ${signerPubkeyIndex}, keyList has ${decodedTx.keyList.length} keys.`);
            }
            const signerPublicKey = decodedTx.keyList[signerPubkeyIndex];
            if (!signerPublicKey) { // Should be redundant due to index check, but safe
                throw new Error(`Signer public key not found at index ${signerPubkeyIndex}.`);
            }


            let isValid = false;
            try {
                isValid = await signerPublicKey.verify(decodedTx.rawUnsignedDataForVerification, signatureBytes);
            } catch (e) {
                console.error(`Error during signature verification for PK index ${signerPubkeyIndex} (${signerPublicKey.toString()}):`, e);
                isValid = false;
            }

            decodedTx.signatures.push({
                signature: signatureBytes,
                signerPublicKey: signerPublicKey,
                signerPubkeyIndex: signerPubkeyIndex,
                isValid: isValid
            });
        }

        if (decoder.peekTag() !== null) {
            console.warn("Warning: Trailing data found in transaction after expected fields. Tag:", decoder.peekTag());
        }

        return decodedTx;

    } catch (error) {
        console.error("Error during transaction decoding:", error);
        if (decoder && typeof decoder.destroy === 'function') {
            decoder.destroy();
        }
        if (unsignedDataEncoder && typeof unsignedDataEncoder.destroy === 'function') {
            unsignedDataEncoder.destroy();
        }
        throw error;
    } finally {
        if (decoder && typeof decoder.destroy === 'function') {
            decoder.destroy();
        }
        if (unsignedDataEncoder && typeof unsignedDataEncoder.destroy === 'function') {
            unsignedDataEncoder.destroy();
        }
    }
}

// --- Example Stringify Replacer (if you use one) ---
/*
function replacer(key, value) {
    if (key === "programId" && typeof value === 'string') {
        return value;
    }
    if (value instanceof Uint8Array) {
        return bytesToHex(value);
    }
    if (typeof value === 'bigint') {
        return value.toString() + 'n';
    }
    if (value instanceof PublicKey) {
        return value.toString();
    }
    return value;
}
*/

// --- Example Usage (Illustrative) ---
/*
async function mainTestDecoder() {
    // ... (same example usage as before) ...
}
// mainTestDecoder();
*/