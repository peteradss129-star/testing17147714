import * as SecureStore from 'expo-secure-store';
import { ChainKey } from './chains';
import { TokenMetadata } from './erc20';

// Reuses expo-secure-store (already a dependency for the mnemonic/PIN)
// instead of AsyncStorage, which needs a native module Expo Go doesn't
// always have linked. Values here aren't secret, but the key list stays
// small (a handful of custom tokens) so SecureStore's size limit is fine.
const STORAGE_KEY = 'wallet_custom_tokens';

export interface StoredToken extends TokenMetadata {
  chain: ChainKey;
}

export async function getStoredTokens(): Promise<StoredToken[]> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getTokensForChain(chain: ChainKey): Promise<StoredToken[]> {
  const all = await getStoredTokens();
  return all.filter((t) => t.chain === chain);
}

export async function addStoredToken(token: StoredToken): Promise<void> {
  const all = await getStoredTokens();
  const exists = all.some(
    (t) => t.chain === token.chain && t.address.toLowerCase() === token.address.toLowerCase()
  );
  if (exists) return;
  all.push(token);
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(all));
}

export async function removeStoredToken(chain: ChainKey, address: string): Promise<void> {
  const all = await getStoredTokens();
  const filtered = all.filter((t) => !(t.chain === chain && t.address.toLowerCase() === address.toLowerCase()));
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(filtered));
}
