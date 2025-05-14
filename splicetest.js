// test-slice.js

// --- Test 1: Node.js Buffer ---
console.log("--- Testing Node.js Buffer ---");

// 1. Create an original Buffer
const originalBuffer = Buffer.from([1, 2, 3, 4, 5]);
console.log("Original Buffer (before):", originalBuffer);

// 2. Create a copy using slice()
const slicedBuffer = originalBuffer.slice();
console.log("Sliced Buffer (before modification):", slicedBuffer);

// 3. Modify the sliced copy (e.g., change an element)
slicedBuffer[0] = 99;
console.log("Sliced Buffer (after modification):", slicedBuffer);

// 4. Check if the original Buffer was affected
console.log("Original Buffer (after modifying slice):", originalBuffer);

// 5. Verify independence
if (originalBuffer[0] === 1) {
    console.log("Result: Node.js Buffer slice() created an independent copy (modification did NOT affect original).");
} else {
    console.error("Result: Node.js Buffer slice() did NOT create an independent copy (modification AFFECTED original!).");
}

console.log("\n---------------------------------\n");

// --- Test 2: Standard Uint8Array ---
console.log("--- Testing Standard Uint8Array ---");

// 1. Create an original Uint8Array
const originalUint8Array = new Uint8Array([10, 20, 30, 40, 50]);
console.log("Original Uint8Array (before):", originalUint8Array);

// 2. Create a copy using slice()
const slicedUint8Array = originalUint8Array.slice();
console.log("Sliced Uint8Array (before modification):", slicedUint8Array);

// 3. Modify the sliced copy (e.g., reverse it)
// Note: .reverse() modifies in-place, so we apply it to the slice
slicedUint8Array.reverse();
console.log("Sliced Uint8Array (after reversing):", slicedUint8Array);

// 4. Check if the original Uint8Array was affected
console.log("Original Uint8Array (after reversing slice):", originalUint8Array);

// 5. Verify independence
if (originalUint8Array[0] === 10 && originalUint8Array[4] === 50) {
    console.log("Result: Uint8Array slice() created an independent copy (modification did NOT affect original).");
} else {
    console.error("Result: Uint8Array slice() did NOT create an independent copy (modification AFFECTED original!).");
}

console.log("\n---------------------------------\n");

// --- Test 3: Node.js Buffer with reverse() ---
// This specifically tests the scenario from our previous discussion
console.log("--- Testing Node.js Buffer with reverse() ---");

// 1. Create an original Buffer
const originalBufferRev = Buffer.from([11, 22, 33, 44, 55]);
console.log("Original Buffer (before reverse test):", originalBufferRev);

// 2. Create a copy using slice()
const slicedBufferRev = originalBufferRev.slice();
console.log("Sliced Buffer (before reverse):", slicedBufferRev);

// 3. Modify the sliced copy using reverse()
slicedBufferRev.reverse(); // Modify the slice in-place
console.log("Sliced Buffer (after reverse):", slicedBufferRev);

// 4. Check if the original Buffer was affected
console.log("Original Buffer (after reversing slice):", originalBufferRev);

// 5. Verify independence
if (originalBufferRev[0] === 11 && originalBufferRev[4] === 55) {
    console.log("Result: Node.js Buffer slice() copy was independent even with reverse() (modification did NOT affect original).");
} else {
    console.error("Result: Node.js Buffer slice() copy was NOT independent with reverse() (modification AFFECTED original!).");
}
