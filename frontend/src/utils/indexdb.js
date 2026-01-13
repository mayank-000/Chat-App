import localforage from "localforage";

const keyStore = localforage.createInstance({
  name: "ChatAppKeys",
  storeName: "PrivateKeys",
});

export async function savePrivateKey(userId, privateKeyString) {
  try {
    await keyStore.setItem(userId, {
      privateKey: privateKeyString,
      timestamp: Date.now(),
    });
    console.log('Private key saved successfully for user:', userId);
  } catch (err) {
    console.error("Failed to save private key", err);
    throw err;
  }
}

// Load private key
export async function loadPrivateKey(userId) {
  try {
    const data = await keyStore.getItem(userId);
    return data ? data.privateKey : null;
  } catch (err) {
    console.error("Failed to load private key:", err);
    return null;
  }
}

// Check if private key exists
export async function hasPrivateKey(userId) {
  try {
    const data = await keyStore.getItem(userId);
    return data !== null;
  } catch (err) {
    console.error("Failed to check private key:", err);
    return false;
  }
}

// Delete private key (for logout)
export async function deletePrivateKey(userId) {
  try {
    await keyStore.removeItem(userId);
    console.log('Private key deleted for user:', userId);
  } catch (err) {
    console.error("Failed to delete private key:", err);
    throw err;
  }
}
