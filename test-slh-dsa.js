import { SLHKeypair } from './src/slh-keypair.js';
import { randomBytes } from 'node:crypto';
import { bytesToHex } from '@noble/hashes/utils';

async function testSLHKeypair() {
    console.log('--- Testing SLHKeypair Abstraction ---');

    // 1. Generate a seed.
    // The fromSecretKey method will extend this to the required length.
    const seed = randomBytes(32);
    console.log(`Generated a random 32-byte seed: ${bytesToHex(seed)}`);

    // 2. Create a keypair from the seed
    console.log('\nCreating keypair from seed...');
    const keypair = await SLHKeypair.fromSecretKey(seed);
    console.log('Keypair created successfully.');

    // 3. Access public and secret keys
    const publicKey = keypair.publicKey;
    const secretKey = keypair.secretKey;

    console.log(`\nPublic Key Length: ${publicKey.toBytes().length} bytes`);
    console.log(`Secret Key Length: ${secretKey.length} bytes`);
    console.log(`Public Key (Hex): ${bytesToHex(publicKey.toBytes())}`);


    // 4. Define a message to sign
    const message = new TextEncoder().encode("This is a test of the SLHKeypair abstraction");
    console.log(`\nMessage to sign: "${new TextDecoder().decode(message)}"`);

    // 5. Sign the message
    console.log('\nSigning message...');
    const signature = await keypair.sign(message);
    console.log(`Signature Length: ${signature.length} bytes`);
    console.log(`Signature (Hex): ${bytesToHex(signature).substring(0, 64)}...`);


    // 6. Verify the signature
    console.log('\nVerifying signature...');
    const isValid = await publicKey.verify(message, signature);

    console.log(`\nVerification result: ${isValid}`);

    if (isValid) {
        console.log('✅ Signature is valid.');
    } else {
        console.error('❌ Signature is NOT valid.');
    }

    // 7. Test address generation
    console.log('\n--- Address Generation ---');
    const address = publicKey.toString();
    console.log(`Generated Bech32m Address: ${address}`);
}

testSLHKeypair().catch(error => {
    console.error("Test failed:", error);
});
