//import { Connection, Wallet, Keypair, PublicKey, bytesToHex, SystemProgram, Transaction } from './dist/lea-wallet.node.mjs';
import { Connection, Wallet, Keypair, PublicKey, bytesToHex, SystemProgram, Transaction } from './src/index.js';

const accountIndex = 0;
const wallet = Wallet.fromMnemonic("legal winner thank year wave sausage worth useful legal winner thank yellow");
const account0 = wallet.getAccount(accountIndex);
console.log(`Wallet Account(${accountIndex}): Address: ${account0.publicKey}`);

/* Example direct key generation not needed */
/*
const receiver1 = Keypair.generate();
const receiver2 = Keypair.generate();

console.log(`Receiver1: ${receiver1.publicKey}`, receiver1.publicKey.toBytes());
console.log(`Receiver2: ${receiver2.publicKey}`, receiver2.publicKey.toBytes());
*/
console.log('--- NEW TRANSACTION SYSTEM ---');

const connection = Connection("local");
const { blockhash } = await connection.getLatestBlockhash();

//const senderPubKey = new PublicKey('lea1ztv2s3k6xfydjvvu3mtvtu8jycpyvvpn65zuh6tencqsvxt0fvxqw0rqww');
const txn = new Transaction();
txn.add(SystemProgram.transfer({
    fromPubkey: account0.publicKey,
    toPubkey: new PublicKey('lea1ztv2s3k6xfydjvvu3mtvtu8jycpyvvpn65zuh6tencqsvxt0fvxqw0rqww'),
    amount: 1000000n,
}));

txn.recentBlockhash = blockhash;
const unsignedTransaction = await txn.toBytes();

console.log(`unsignedTransaction (${unsignedTransaction.length})\n`, bytesToHex(unsignedTransaction));

await txn.sign(account0);

const signedTransaction = await txn.toBytes();
console.log(`signedTransaction (${signedTransaction.length})\n`, bytesToHex(signedTransaction));

const sendTxResponse = await connection.sendTransaction([bytesToHex(signedTransaction)]);
console.log('sendTxResponse', sendTxResponse);


const theBalance = await connection.getBalance([account0.publicKey.toString()]);
console.log('theBalance', theBalance);