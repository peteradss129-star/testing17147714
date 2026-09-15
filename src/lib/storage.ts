import * as SecureStore from 'expo-secure-store';

// All values live in the OS-backed secure enclave (iOS Keychain /
// Android Keystore) via expo-secure-store — never in AsyncStorage,
// which is unencrypted on-disk storage.
const KEYS = {
  MNEMONIC: 'wallet_mnemonic',
  PIN_HASH: 'wallet_pin_hash',
} as const;

export async function saveMnemonic(mnemonic: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.MNEMONIC, mnemonic, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

export async function getMnemonic(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.MNEMONIC);
}

export async function hasWallet(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(KEYS.MNEMONIC);
  return value !== null;
}

export async function deleteWallet(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.MNEMONIC);
  await SecureStore.deleteItemAsync(KEYS.PIN_HASH);
}

export async function savePinHash(hash: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.PIN_HASH, hash);
}

export async function getPinHash(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.PIN_HASH);
}
