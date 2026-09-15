import { ChainConfig } from './chains';
import * as evmWallet from './wallet';
import * as evmToken from './erc20';
import * as evmHistory from './evmHistory';
import * as btc from './bitcoin';
import * as tron from './tron';

// Dispatches wallet operations to the right chain-family module (EVM,
// Bitcoin, or Tron) so screens don't need to know which signing/RPC scheme
// a given chain uses.

export function deriveAddress(mnemonic: string, chain: ChainConfig): string {
  switch (chain.family) {
    case 'evm':
      return evmWallet.deriveAddress(mnemonic);
    case 'bitcoin':
      return btc.deriveBitcoinAddress(mnemonic, chain.isTestnet);
    case 'tron':
      return tron.deriveTronAddress(mnemonic);
  }
}

export async function getNativeBalance(mnemonic: string, chain: ChainConfig): Promise<string> {
  switch (chain.family) {
    case 'evm':
      return evmWallet.getBalance(deriveAddress(mnemonic, chain), chain.key);
    case 'bitcoin':
      return btc.getBitcoinBalance(deriveAddress(mnemonic, chain), chain.isTestnet);
    case 'tron':
      return tron.getTronBalance(deriveAddress(mnemonic, chain), chain.isTestnet);
  }
}

export interface SendResult {
  hash: string;
}

export async function sendNative(
  mnemonic: string,
  chain: ChainConfig,
  toAddress: string,
  amount: string
): Promise<SendResult> {
  switch (chain.family) {
    case 'evm':
      return evmWallet.sendNativeToken(mnemonic, chain.key, toAddress, amount);
    case 'bitcoin':
      return btc.sendBitcoin(mnemonic, chain.isTestnet, toAddress, amount);
    case 'tron':
      return tron.sendTrx(mnemonic, chain.isTestnet, toAddress, amount);
  }
}

// Best-effort fee estimate shown in the send-confirmation dialog, in the
// chain's native symbol. Bitcoin and Tron estimates require the actual
// recipient/amount (they depend on UTXO selection / bandwidth-energy
// accounting), unlike EVM's flat 21000-gas estimate.
export async function estimateFee(
  mnemonic: string,
  chain: ChainConfig,
  toAddress: string,
  amount: string,
  token?: { address: string; decimals: number }
): Promise<string> {
  if (chain.family === 'evm' && !token) {
    return evmWallet.estimateGasFee(chain.key);
  }
  if (chain.family === 'bitcoin' && !token) {
    return btc.estimateBitcoinFee(mnemonic, chain.isTestnet, toAddress, amount);
  }
  if (chain.family === 'tron') {
    return token
      ? tron.estimateTrc20Fee(mnemonic, chain.isTestnet, token.address, toAddress, amount, token.decimals)
      : tron.estimateTrxFee(mnemonic, chain.isTestnet, toAddress, amount);
  }
  throw new Error('Fee estimate not available for this asset');
}

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

// Only EVM (ERC-20) and Tron (TRC-20) support tokens; Bitcoin has none.
export function chainSupportsTokens(chain: ChainConfig): boolean {
  return chain.family === 'evm' || chain.family === 'tron';
}

export async function fetchTokenMetadata(chain: ChainConfig, tokenAddress: string): Promise<TokenMetadata> {
  if (chain.family === 'evm') {
    return evmToken.fetchTokenMetadata(chain.key, tokenAddress);
  }
  if (chain.family === 'tron') {
    return tron.fetchTrc20Metadata(tokenAddress, chain.isTestnet);
  }
  throw new Error(`${chain.name} does not support tokens`);
}

export async function getTokenBalance(
  chain: ChainConfig,
  tokenAddress: string,
  ownerAddress: string,
  decimals: number
): Promise<string> {
  if (chain.family === 'evm') {
    return evmToken.getTokenBalance(chain.key, tokenAddress, ownerAddress, decimals);
  }
  if (chain.family === 'tron') {
    return tron.getTrc20Balance(tokenAddress, ownerAddress, chain.isTestnet, decimals);
  }
  throw new Error(`${chain.name} does not support tokens`);
}

export async function sendToken(
  mnemonic: string,
  chain: ChainConfig,
  tokenAddress: string,
  toAddress: string,
  amount: string,
  decimals: number
): Promise<SendResult> {
  if (chain.family === 'evm') {
    return evmToken.sendToken(mnemonic, chain.key, tokenAddress, toAddress, amount, decimals);
  }
  if (chain.family === 'tron') {
    return tron.sendTrc20(mnemonic, chain.isTestnet, tokenAddress, toAddress, amount, decimals);
  }
  throw new Error(`${chain.name} does not support tokens`);
}

export interface TxHistoryItem {
  hash: string;
  direction: 'in' | 'out' | 'self';
  amount: string;
  counterparty?: string;
  timestamp: number;
  confirmed: boolean;
  explorerUrl: string;
}

export async function getTransactionHistory(
  chain: ChainConfig,
  address: string,
  token?: { address: string; decimals: number }
): Promise<TxHistoryItem[]> {
  let items: Omit<TxHistoryItem, 'explorerUrl'>[];

  if (chain.family === 'evm') {
    items = token
      ? await evmHistory.getTokenTransactionHistory(chain.key, address, token.address, token.decimals)
      : await evmHistory.getTransactionHistory(chain.key, address);
  } else if (chain.family === 'bitcoin') {
    items = await btc.getBitcoinHistory(address, chain.isTestnet);
  } else {
    items = token
      ? await tron.getTrc20History(address, token.address, chain.isTestnet, token.decimals)
      : await tron.getTronHistory(address, chain.isTestnet);
  }

  return items.map((item) => ({ ...item, explorerUrl: chain.explorerTxUrl(item.hash) }));
}
