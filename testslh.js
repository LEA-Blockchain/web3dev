import { SLHKeypair } from './src/slh-keypair.js';

async function testSLHKeypair() {
    console.log('🔐 Generating SLH-DSA keypair...');
    const keypair = await SLHKeypair.fromSecretKey(new TextEncoder().encode('test123')); // Ensure seed is Uint8Array

    const publicKeyBytes = keypair.publicKey.toBytes(); // Get public key as Uint8Array
    const secretKey = keypair.secretKey;

    console.log('✅ Public key length:', publicKeyBytes.length);
    console.log('✅ Secret (seed) length:', secretKey.length);
    console.log('📬 Public address (Bech32m, hashed):', keypair.publicKey.toString());

    const message = new TextEncoder().encode('Hello SLH-DSA!');
    console.log('\n📝 Message to sign:', new TextDecoder().decode(message));

    console.log('✍️  Signing...');
    const signature = await keypair.sign(message);
    console.log('✅ Signature generated:', signature.length, 'bytes');

    console.log('🔍 Verifying...');
    const isValid = await keypair.publicKey.verify(message, signature);
    console.log('✅ Signature valid?', isValid ? '✅ YES' : '❌ NO');

    console.log('\n🔁 Regenerating from seed to test determinism...');
    const regenerated = await SLHKeypair.fromSecretKey(new TextEncoder().encode('test123')); // Ensure seed is Uint8Array
    const samePub = regenerated.publicKey.equals(keypair.publicKey);
    console.log('🧪 Public key match after re-derivation from seed?', samePub ? '✅ YES' : '❌ NO');

    return {
        publicKey: publicKeyBytes,
        privateKey: secretKey, // Renamed for clarity in the return value
        signature: signature
    };
}

// Run test
testSLHKeypair().then((result) => {
    console.log('\n--- Test Results ---');
    console.log('Returned Public Key (Uint8Array):', result.publicKey);
    console.log('Returned Private Key (Uint8Array):', result.privateKey);
    console.log('Returned Signature (Uint8Array):', result.signature);
}).catch((err) => {
    console.error('❌ Test failed:', err);
});