// Preserve the existing PBKDF2 format while avoiding CPU work on the UI thread
// in secure contexts. HTTP previews retain the compatible JavaScript fallback.
export async function hashPassword(password: string, salt: string) {
  let bits: Uint8Array;
  if (globalThis.crypto?.subtle) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"],
    );
    bits = new Uint8Array(await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" },
      key, 256,
    ));
  } else {
    const [{ pbkdf2Async }, { sha256 }] = await Promise.all([
      import("@noble/hashes/pbkdf2.js"), import("@noble/hashes/sha2.js"),
    ]);
    bits = await pbkdf2Async(sha256, password, salt, { c: 100000, dkLen: 32 });
  }
  return Array.from(bits, (b) => b.toString(16).padStart(2, "0")).join("");
}
