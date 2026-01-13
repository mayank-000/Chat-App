import api from "./api";

// Helper: ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper: String to ArrayBuffer
function stringToArrayBuffer(str) {
  return new TextEncoder().encode(str);
}

// Helper: ArrayBuffer to String
function arrayBufferToString(buffer) {
  return new TextDecoder().decode(buffer);
}

// 1. Generate RSA Key Pair
export async function generateKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,  // extractable
    ["encrypt", "decrypt"]
  );
}

// 2. Export Public Key (to send to server)
export async function exportPublicKey(publicKey) {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  return arrayBufferToBase64(exported);
}

// 3. Export Private Key (to store in IndexedDB)
export async function exportPrivateKey(privateKey) {
  const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
  return arrayBufferToBase64(exported);
}

// 4. Import Public Key (from base64 string)
export async function importPublicKey(base64String) {
  const buffer = base64ToArrayBuffer(base64String);
  return await window.crypto.subtle.importKey(
    "spki",
    buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    false,
    ["encrypt"]
  );
}

// 5. Import Private Key (from IndexedDB)
export async function importPrivateKey(base64String) {
  const buffer = base64ToArrayBuffer(base64String);
  return await window.crypto.subtle.importKey(
    "pkcs8",
    buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    false,
    ["decrypt"]
  );
}

// 6. Encrypt Message (with recipient's public key)
export async function encryptMessage(message, recipientPublicKeyString) {
  // Import recipient's public key
  const publicKey = await importPublicKey(recipientPublicKeyString);
  
  // Convert message to ArrayBuffer
  const messageBuffer = stringToArrayBuffer(message);
  
  // Encrypt
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    messageBuffer
  );
  
  // Return as base64
  return arrayBufferToBase64(encrypted);
}

// 7. Decrypt Message (with your private key)
export async function decryptMessage(encryptedMessageBase64, privateKey) {
  // Convert base64 to ArrayBuffer
  const encryptedBuffer = base64ToArrayBuffer(encryptedMessageBase64);
  
  // Decrypt
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedBuffer
  );
  
  // Convert back to string
  return arrayBufferToString(decrypted);
}

// Default export (optional, for compatibility)
const encryptionService = {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPublicKey,
  importPrivateKey,
  encryptMessage,
  decryptMessage
};

export default encryptionService;
