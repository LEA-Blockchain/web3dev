//import { Wallet, SystemProgram, Connection, generateMnemonic } from './src/index.js';
import { Wallet, SystemProgram, Connection, generateMnemonic } from './dist/lea-wallet.node.mjs'

import fs from 'fs';

const MNEMONIC = "legal winner thank year wave sausage worth useful legal winner thank yellow";
const ACCOUNT_INDEX = 0;

(async () => {
    try {
        // --- Generate mnemonic test
        //const mnemonic = generateMnemonic();
        //console.log("Generated Mnemonic:", mnemonic);
        // 1. Setup Wallet and Account
        console.log("--- Wallet Setup ---");
        const wallet = await Wallet.fromMnemonic(MNEMONIC);

        //Authenicate timestamp
        console.log("\n\n--- Authenticating Timestamp ---");
        const signTimestamp = await wallet.signTimestamp(Math.floor(Date.now() / 1000), ACCOUNT_INDEX);
        console.log("Signed Timestamp:", signTimestamp);

        //const wallet = await Wallet.fromMnemonic(mnemonic);
        const account = await wallet.getAccount(ACCOUNT_INDEX);
        //lea1sv9d4ayz8lm4mjxnxdu42c23g0jpk7w7r3g2euvug5ltn4wfnffq8pnjnn
        console.log(`Account Address (bech32m): ${account.address}`);

        console.log("\n\n--- Creating PublishKeyPair Transaction ---");

        const connection = Connection("local");

        //!!! mint coins need to be whitelisted first!!!
        /*
                // --- Publish Keyset ---
                const publishKeysetObject = await SystemProgram.publishKeyset(account.keyset);
                const publishKeysetResponse = await connection.sendTransaction(publishKeysetObject);
                if (!publishKeysetResponse.ok) {
                    console.error('[error] publishKeyset failed:', publishKeysetResponse.status, publishKeysetResponse.decoded || publishKeysetResponse.raw);
                } else if (publishKeysetResponse.decodeError) {
                    console.warn('[warn] Decoding publishKeyset failed:', publishKeysetResponse.decodeError);
                } else {
                    console.log('[log] Keyset published successfully:', publishKeysetResponse.decoded);
                }
        
                // --- Get maximum allowed mint ---
                const getAllowedMintObject = await SystemProgram.getAllowedMint(account.address);
                const getAllowedMintResponse = await connection.sendTransaction(getAllowedMintObject);
        
                if (!getAllowedMintResponse.ok) {
                    console.error('[error] getAllowedMint failed:', getAllowedMintResponse.status, getAllowedMintResponse.decoded || getAllowedMintResponse.raw);
                } else if (getAllowedMintResponse.decodeError) {
                    console.warn('[warn] Decoding getAllowedMint failed:', getAllowedMintResponse.decodeError);
                } else {
                    console.log('[log] Maximum allowed mint:', getAllowedMintResponse.decoded);
                }
        */
        // --- Mint 10 Microlea ---
        const mintTransactionObject = await SystemProgram.mint(account.keyset, account.address, 10n);
        const mintTransactionResponse = await connection.sendTransaction(mintTransactionObject);

        if (!mintTransactionResponse.ok) {
            console.error('[error] mint failed:', mintTransactionResponse.status, mintTransactionResponse.decoded || mintTransactionResponse.raw);
        } else if (mintTransactionResponse.decodeError) {
            console.warn('[warn] Decoding mint result failed:', mintTransactionResponse.decodeError);
        } else {
            console.log('[log] Mint successful:', mintTransactionResponse.decoded);
        };


        // --- Get Balance ---
        const getBalanceObject = await SystemProgram.getBalance(account.address);
        const getBalanceResponse = await connection.sendTransaction(getBalanceObject)
        if (!getBalanceResponse.ok) {
            console.error('[error] getBalance failed:', getBalanceResponse.status, getBalanceResponse.decoded || getBalanceResponse.raw);
        } else if (getBalanceResponse.decodeError) {
            console.warn('[warn] Decoding getBalance failed:', getBalanceResponse.decodeError);
        } else {
            console.log('[log] Current balance:', getBalanceResponse.decoded);
        }


    } catch (error) {
        console.error("\n--- SCRIPT FAILED ---");
        console.error(error);
    }
})();