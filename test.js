import { Wallet, SystemProgram, Connection } from './src/index.js';

const MNEMONIC = "legal winner thank year wave sausage worth useful legal winner thank yellow";
const ACCOUNT_INDEX = 0;

(async () => {
    try {
        // 1. Setup Wallet and Account
        console.log("--- Wallet Setup ---");
        const wallet = await Wallet.fromMnemonic(MNEMONIC);
        const account = await wallet.getAccount(ACCOUNT_INDEX);

        console.log(`Account Address (bech32m): ${account.address}`);

        console.log("\n\n--- Creating PublishKeyPair Transaction ---");

        const transferTransactionBytes = await SystemProgram.transfer(account.keyset, "lea16wk0htexlu9pdd38mmgaanf4jdzwp9pkwq4m932exkvgaartnw7s5ef25d", 100n)
        console.log('transferTransactionBytes:', transferTransactionBytes);

        const mintTransactionBytes = await SystemProgram.mint(account.keyset, "lea16wk0htexlu9pdd38mmgaanf4jdzwp9pkwq4m932exkvgaartnw7s5ef25d", 100n)
        console.log('mintTransactionBytes:', mintTransactionBytes);

        const burnTransactionBytes = await SystemProgram.burn(account.keyset, 50n)
        console.log('burnTransactionBytes:', burnTransactionBytes);

        const publishKeysetTransactionBytes = await SystemProgram.publishKeyset(account.keyset)
        console.log('publishKeysetTransactionBytes:', publishKeysetTransactionBytes);

        const mintWhitelistTransactionBytes = await SystemProgram.mintWhitelist(account.keyset, "lea16wk0htexlu9pdd38mmgaanf4jdzwp9pkwq4m932exkvgaartnw7s5ef25d", 100n)
        console.log('mintWhitelistTransactionBytes:', mintWhitelistTransactionBytes);

        const getAllowedMintTransactionBytes = await SystemProgram.getAllowedMint("lea16wk0htexlu9pdd38mmgaanf4jdzwp9pkwq4m932exkvgaartnw7s5ef25d")
        console.log('getAllowedMintTransactionBytes:', getAllowedMintTransactionBytes);

        const getBalanceTransactionBytes = await SystemProgram.getBalance("lea16wk0htexlu9pdd38mmgaanf4jdzwp9pkwq4m932exkvgaartnw7s5ef25d")
        console.log('getBalanceTransactionBytes:', getBalanceTransactionBytes);

        const getCurrentSupplyTransactionBytes = await SystemProgram.getCurrentSupply()
        console.log('getCurrentSupplyTransactionBytes:', getCurrentSupplyTransactionBytes);

        const connection = Connection("local");
        const response = await connection.sendTransaction(getCurrentSupplyTransactionBytes);
        console.log('Response from getCurrentSupply:', response);

        const parsedSupply = await SystemProgram.parseGetCurrentSupply(response);
        console.log('Parsed Current Supply:', parsedSupply);

    } catch (error) {
        console.error("\n--- SCRIPT FAILED ---");
        console.error(error);
    }
})();