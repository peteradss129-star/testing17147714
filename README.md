# MyWallet

A non-custodial, multi-chain crypto wallet for mobile, built with Expo (React Native)
and ethers.js — the same core approach used by wallets like Trust Wallet.

## What's implemented

- **Wallet creation & import**: one BIP-39 mnemonic derives keys for every chain
  family below — the same recovery phrase backs up everything
- **Multi-chain support**:
  - **EVM**: Ethereum, BNB Smart Chain, and Polygon (plus their Sepolia/BSC
    Testnet/Amoy testnets) share one address and one signing path (`m/44'/60'/0'/0/0`)
    — see `src/lib/wallet.ts`
  - **Bitcoin**: native SegWit (BIP84, `m/84'/0'/0'/0/0`) addresses, balance and
    UTXO handling via the Blockstream Esplora API — see `src/lib/bitcoin.ts`
  - **Tron**: `m/44'/195'/0'/0/0` derivation, TRX balance/transfers and TRC-20
    token support via the TronGrid API — see `src/lib/tron.ts`
  - `src/lib/chainService.ts` dispatches to whichever chain family a given
    chain belongs to, so screens don't need per-chain branching
- **Testnet mode**: a toggle on the home screen switches all balances/sends between
  mainnet and free testnets (Sepolia, BSC Testnet, Polygon Amoy, Bitcoin Testnet,
  Tron Shasta), for safe experimentation with faucet funds
- **Secure key storage**: the mnemonic is stored via `expo-secure-store`, which uses
  the iOS Keychain / Android Keystore — never AsyncStorage, never sent to a server
- **PIN lock**: a 6+ digit PIN (hashed with SHA-256) gates app unlock and every
  outgoing transaction, with exponential-backoff lockout after 5 failed attempts
  (`src/lib/pinAuth.ts`) shared by both unlock and transaction confirmation
- **Biometric unlock**: Face ID / fingerprint via `expo-local-authentication`,
  offered automatically on the unlock screen when the device supports it, with
  PIN as the fallback
- **Auto-lock on background**: backgrounding the app immediately clears the
  in-memory mnemonic and returns to the lock screen
- **Transaction confirmation**: before signing, a review step shows the
  recipient, amount, and network — with a live gas estimate for EVM native sends
- **Balances**: live native-coin balances per chain via public RPC/API endpoints
- **Custom tokens (ERC-20 and TRC-20)**: paste any token's contract address to look
  up its symbol/decimals on-chain, track its balance, and send it
- **Send / Receive**: send native coins or tokens with an on-chain transaction,
  receive via a per-chain address + QR code
- **QR scanner**: scan a recipient's QR code from the send screen instead of typing
  an address (`src/screens/ScanQRScreen.tsx`, via `expo-camera`)
- **Per-asset transaction history**: tapping a coin or token opens a detail screen
  with its balance and recent transactions, tap any row to open it on a block
  explorer — Bitcoin via Blockstream, Tron via TronGrid, EVM via the relevant
  Etherscan-family API (`src/lib/evmHistory.ts`)

## What's out of scope for this MVP

- A curated/default token list (tokens must be added manually by contract address)
- Solana, or any chain family beyond EVM/Bitcoin/Tron
- WalletConnect / dApp browser
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
    chains.ts       # chain configs (family, RPC URLs, chain IDs, explorers, faucets)
    chainService.ts # dispatches address/balance/send calls by chain family
    wallet.ts       # EVM: mnemonic generation, HD derivation, balance/send logic
    erc20.ts        # EVM: ERC-20 metadata lookup, balance, and transfer
    bitcoin.ts      # Bitcoin: address derivation, UTXO balance/send/history via Blockstream
    tron.ts         # Tron: address derivation, TRX/TRC-20 balance/send/history via TronGrid
    evmHistory.ts   # EVM: transaction history via Etherscan-family explorer APIs
    tokenStorage.ts # secure-store-backed list of custom tokens the user added
    storage.ts      # SecureStore wrapper (mnemonic, PIN hash, lockout state)
    pin.ts          # PIN hashing/verification
    pinAuth.ts      # PIN check with failed-attempt lockout, shared by unlock + send
    biometrics.ts   # Face ID / fingerprint helpers (expo-local-authentication)
  context/
    WalletContext.tsx  # app-wide wallet state (locked/unlocked, address, mnemonic)
  screens/        # onboarding, home, send, receive, add-token, scan-qr,
                  # asset-history screens
  navigation/      # stack navigator wiring
```

## Security notes before using this with real funds

This is a starting point, not an audited production wallet. Before putting real
value into it:

- Replace the public RPC endpoints in `src/lib/chains.ts` with your own
  (Infura/Alchemy/QuickNode) — public endpoints are rate-limited and third-party
  operated
- EVM transaction history calls the relevant Etherscan/BscScan/PolygonScan API
  without an API key, which is rate-limited and the least battle-tested part of
  this codebase — add your own key (`&apikey=...`) to `explorerApiUrl` in
  `src/lib/chains.ts` if it's flaky
- Get an independent security audit — a bug here means lost funds, not just a
  broken feature
- Consider adding jailbreak/root detection and certificate pinning for RPC calls
- Consider an idle/inactivity timeout in addition to the background lock, and a
  "wipe after N failed PIN attempts" option for lost-device scenarios
