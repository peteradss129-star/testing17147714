import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  background: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  danger: string;
  success: string;
  warning: string;
}

const darkColors: ThemeColors = {
  background: '#0B0E17',
  surface: '#151A26',
  border: '#2A2F3D',
  textPrimary: '#FFFFFF',
  textSecondary: '#9AA3B2',
  textMuted: '#5A6172',
  primary: '#627EEA',
  danger: '#E5484D',
  success: '#3DD68C',
  warning: '#F0B90B',
};

const lightColors: ThemeColors = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  border: '#E2E5EA',
  textPrimary: '#0B0E17',
  textSecondary: '#5A6172',
  textMuted: '#9AA3B2',
  primary: '#4C5FD5',
  danger: '#D0342C',
  success: '#1C9A63',
  warning: '#B8860B',
};

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_STORAGE_KEY = 'wallet_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    SecureStore.getItemAsync(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setMode(saved);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      SecureStore.setItemAsync(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const colors = mode === 'dark' ? darkColors : lightColors;

  return <ThemeContext.Provider value={{ mode, colors, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
