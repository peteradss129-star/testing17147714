import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as storage from '../lib/storage';
import { deriveAddress } from '../lib/wallet';
import { checkPin, PinCheckResult } from '../lib/pinAuth';
import { authenticateWithBiometrics } from '../lib/biometrics';

interface WalletContextValue {
  isLoading: boolean;
  hasWallet: boolean;
  isUnlocked: boolean;
  address: string | null;
  mnemonic: string | null;
  createWallet: (mnemonic: string, pin: string) => Promise<void>;
  importWallet: (mnemonic: string, pin: string) => Promise<void>;
  unlock: (pin: string) => Promise<PinCheckResult>;
  unlockWithBiometrics: () => Promise<boolean>;
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
  const isUnlockedRef = useRef(isUnlocked);
  isUnlockedRef.current = isUnlocked;

  useEffect(() => {
    (async () => {
      const exists = await storage.hasWallet();
      setHasWalletState(exists);
      setIsLoading(false);
    })();
  }, []);

  // Lock the wallet the moment the app is fully backgrounded — a wallet
  // sitting unlocked in the app switcher is a real theft-of-device risk.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' && isUnlockedRef.current) {
        setIsUnlocked(false);
        setMnemonic(null);
      }
    });
    return () => subscription.remove();
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

  const unlock = useCallback(async (pin: string): Promise<PinCheckResult> => {
    const result = await checkPin(pin);
    if (result.ok) {
      const storedMnemonic = await storage.getMnemonic();
      if (!storedMnemonic) return { ok: false, message: 'No wallet found on this device.' };
      setMnemonic(storedMnemonic);
      setAddress(deriveAddress(storedMnemonic));
      setIsUnlocked(true);
    }
    return result;
  }, []);

  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    const success = await authenticateWithBiometrics();
    if (!success) return false;
    const storedMnemonic = await storage.getMnemonic();
    if (!storedMnemonic) return false;
    setMnemonic(storedMnemonic);
    setAddress(deriveAddress(storedMnemonic));
    setIsUnlocked(true);
    return true;
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
      unlockWithBiometrics,
      lock,
      resetWallet,
    }),
    [
      isLoading,
      hasWalletState,
      isUnlocked,
      address,
      mnemonic,
      createWallet,
      importWallet,
      unlock,
      unlockWithBiometrics,
      lock,
      resetWallet,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
