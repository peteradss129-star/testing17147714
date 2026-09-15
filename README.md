# MyWallet

A non-custodial, multi-chain crypto wallet for mobile, built with Expo (React Native)
and ethers.js — the same core approach used by wallets like Trust Wallet.

## What's implemented

- **Wallet creation & import**: BIP-39 mnemonic generation, BIP-44 HD key derivation
  (`m/44'/60'/0'/0/0`) via ethers.js
- **Multi-chain support (EVM)**: Ethereum, BNB Smart Chain, and Polygon (plus their
  Sepolia/BSC Testnet/Amoy testnets) share one address and one signing path — see
  `src/lib/chains.ts`
- **Testnet mode**: a toggle on the home screen switches all balances/sends between
  mainnet and free testnets, for safe experimentation with faucet funds
- **Secure key storage**: the mnemonic is stored via `expo-secure-store`, which uses
  the iOS Keychain / Android Keystore — never AsyncStorage, never sent to a server
- **PIN lock**: a 6+ digit PIN (hashed with SHA-256) gates app unlock and every
  outgoing transaction
- **Balances**: live native-token balances per chain via public RPC endpoints
- **Custom ERC-20 tokens**: paste any token's contract address to look up its
  symbol/decimals on-chain, track its balance, and send it — see `src/lib/erc20.ts`
- **Send / Receive**: send native coins or tokens with an on-chain transaction,
  receive via address + QR code

## What's out of scope for this MVP

- A curated/default token list (tokens must be added manually by contract address)
- Bitcoin, Solana, or any non-EVM chain
- WalletConnect / dApp browser
- Biometric unlock (Face ID / fingerprint) — PIN only
- Backend services — this is 100% client-side and non-custodial

## Getting started

```bash
npm install
npm start
```

Then scan the QR code with the **Expo Go** app (iOS/Android) to run it on your
phone, or press `a` / `i` in the terminal for an Android/iOS emulator if you have
one set up.

## Project structure

```
src/
  lib/
    chains.ts       # chain configs (RPC URLs, chain IDs, explorers, faucets)
    wallet.ts       # mnemonic generation, HD derivation, balance/send logic
    erc20.ts        # ERC-20 metadata lookup, balance, and transfer
    tokenStorage.ts # secure-store-backed list of custom tokens the user added
    storage.ts      # SecureStore wrapper (mnemonic, PIN hash)
    pin.ts          # PIN hashing/verification
  context/
    WalletContext.tsx  # app-wide wallet state (locked/unlocked, address, mnemonic)
  screens/        # onboarding, home, send, receive, add-token screens
  navigation/      # stack navigator wiring
```

## Security notes before using this with real funds

This is a starting point, not an audited production wallet. Before putting real
value into it:

- Replace the public RPC endpoints in `src/lib/chains.ts` with your own
  (Infura/Alchemy/QuickNode) — public endpoints are rate-limited and third-party
  operated
- Add biometric unlock and auto-lock on backgrounding
- Add transaction simulation / confirmation screens showing gas fees before signing
- Get an independent security audit — a bug here means lost funds, not just a
  broken feature
- Consider adding jailbreak/root detection and certificate pinning for RPC calls
