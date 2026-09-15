import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as storage from '../lib/storage';
import { deriveAddress } from '../lib/wallet';

interface WalletContextValue {
  isLoading: boolean;
  hasWallet: boolean;
  isUnlocked: boolean;
  address: string | null;
  mnemonic: string | null;
  createWallet: (mnemonic: string, pin: string) => Promise<void>;
  importWallet: (mnemonic: string, pin: string) => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  resetWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasWalletState, setHasWalletState] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [mnemonic, setMnemonic] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const exists = await storage.hasWallet();
      setHasWalletState(exists);
      setIsLoading(false);
    })();
  }, []);

  const createWallet = useCallback(async (newMnemonic: string, pin: string) => {
    const { hashPin } = await import('../lib/pin');
    await storage.saveMnemonic(newMnemonic);
    await storage.savePinHash(await hashPin(pin));
    setMnemonic(newMnemonic);
    setAddress(deriveAddress(newMnemonic));
    setHasWalletState(true);
    setIsUnlocked(true);
  }, []);

  const importWallet = createWallet;

  const unlock = useCallback(async (pin: string) => {
    const storedHash = await storage.getPinHash();
    if (!storedHash) return false;
    const { verifyPin } = await import('../lib/pin');
    const valid = await verifyPin(pin, storedHash);
    if (valid) {
      const storedMnemonic = await storage.getMnemonic();
      if (!storedMnemonic) return false;
      setMnemonic(storedMnemonic);
      setAddress(deriveAddress(storedMnemonic));
      setIsUnlocked(true);
    }
    return valid;
  }, []);

  const lock = useCallback(() => {
    setIsUnlocked(false);
    setMnemonic(null);
  }, []);

  const resetWallet = useCallback(async () => {
    await storage.deleteWallet();
    setHasWalletState(false);
    setIsUnlocked(false);
    setMnemonic(null);
    setAddress(null);
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      hasWallet: hasWalletState,
      isUnlocked,
      address,
      mnemonic,
      createWallet,
      importWallet,
      unlock,
      lock,
      resetWallet,
    }),
    [isLoading, hasWalletState, isUnlocked, address, mnemonic, createWallet, importWallet, unlock, lock, resetWallet]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
