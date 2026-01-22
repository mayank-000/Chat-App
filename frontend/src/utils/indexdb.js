import localforage from "localforage";

const keyStore = localforage.createInstance({
  name: "ChatAppKeys",
  storeName: "PrivateKeys",
  driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE], // FALLBACK drivers
  version: 1.0,
  description: "Secure storage for encryption keys"
});

export async function savePrivateKey(userId, privateKeyString) {
  try {
    const key = `user_${userId}_privateKey`;
    await keyStore.setItem(key, {
      privateKey: privateKeyString,
      timestamp: Date.now(),
      userId: userId
    });
    
    // VERIFY Save
    const verify = await keyStore.getItem(key);
    if(!verify) throw new Error("Verification failed after save");
    
    console.log('Private key saved and verified successfully for user:', userId);
    return true;
  } catch (err) {
    console.error("Failed to save private key", err);
    throw err;
  }
}

// Load private key
export async function loadPrivateKey(userId) {
  try {
    const key = `user_${userId}_privateKey`;
    const data = await keyStore.getItem(key);

    if(!data) {
      console.warn('⚠️ No private key found for user:', userId);
      return null;
    }

    return data.privateKey;
  } catch (err) {
    console.error("❌ Failed to load private key:", err);
    return null;
  }
}

// Check if private key exists
export async function hasPrivateKey(userId) {
  try {
    const key = `user_${userId}_privateKey`;
    const data = await keyStore.getItem(key);
    const exists = data !== null;
    console.log(`🔍 Key exists for user ${userId}:`, exists);
    return exists;
  } catch (err) {
    console.error("❌ Failed to check private key:", err);
    return false;
  }
}

// Delete private key (for logout)
export async function deletePrivateKey(userId) {
  try {
    const key = `user_${userId}_privateKey`;
    await keyStore.removeItem(key);
    console.log('🗑️ Private key deleted for user:', userId);
  } catch (err) {
    console.error("❌ Failed to delete private key:", err);
    throw err;
  }
}
