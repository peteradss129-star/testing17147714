import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChainKey } from './chains';
import { TokenMetadata } from './erc20';

// Custom token lists are public contract addresses, not secrets, so
// AsyncStorage (unencrypted) is fine here — unlike the mnemonic, which
// lives in expo-secure-store.
const STORAGE_KEY = 'wallet_custom_tokens';

export interface StoredToken extends TokenMetadata {
  chain: ChainKey;
}

export async function getStoredTokens(): Promise<StoredToken[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
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
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export async function removeStoredToken(chain: ChainKey, address: string): Promise<void> {
  const all = await getStoredTokens();
  const filtered = all.filter((t) => !(t.chain === chain && t.address.toLowerCase() === address.toLowerCase()));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
