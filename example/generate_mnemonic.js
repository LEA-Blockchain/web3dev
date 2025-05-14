import { bytesToHex, hexToBytes, generateMnemonic, Wallet, utf8ToBytes } from '../dist/lea-wallet.node.mjs';

console.log("12:", generateMnemonic());
console.log("15:", generateMnemonic(160));
console.log("24:", generateMnemonic(256));

console.log("Correct:")
const wallet1 = Wallet.fromMnemonic("legal winner thank year wave sausage worth useful legal winner thank yellow");

const account0 = wallet1.getAccount(1);
Uint8Array
const message = utf8ToBytes("Hello World");
console.log(await account0.sign(message));


const signBytes = await account0.sign(message);
console.log('signBytes', hexToBytes(bytesToHex(signBytes)));

console.log("address:", account0.publicKey.toString());
console.log("address: ", account0.publicKey.toBytes());
console.log(`address: ${account0.publicKey}`);

/*
console.log("Wrong:");

try{
    const wallet2 = Wallet.fromMnemonic("legal winner thank year wave sausage worth useful legal winner yellow thank");
}
catch(error){
    console.log(error.message);
}
*/