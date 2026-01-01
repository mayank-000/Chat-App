import localforage from "localforage";

const keyStore = localforage.createInstance({
  name: "myAppKeyStore",
  storeName: "Privatekeys",
});

export async function savePrivateKey(userId, privateKeyString) {
  try {
    await keyStore.setItem(userId, {
      privateKey: privateKeyString,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to save private key", err);
    throw err;
  }
}

export async function loadPrivateKey(userId) {
    const data = await keyStore.getItem(userId);
    return data ? data.privateKey : null;
}
