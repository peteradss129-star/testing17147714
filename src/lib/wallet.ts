import 'react-native-get-random-values';
import { ethers } from 'ethers';
import { CHAINS, ChainKey } from './chains';

const DERIVATION_PATH = "m/44'/60'/0'/0/0";
const providerCache: Partial<Record<ChainKey, ethers.JsonRpcProvider>> = {};

export function generateMnemonic(): string {
  return ethers.Wallet.createRandom().mnemonic!.phrase;
}

export function isValidMnemonic(mnemonic: string): boolean {
  try {
    ethers.Mnemonic.fromPhrase(mnemonic.trim());
    return true;
  } catch {
    return false;
  }
}

export function deriveAddress(mnemonic: string): string {
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic.trim(), undefined, DERIVATION_PATH);
  return wallet.address;
}

function getProvider(chain: ChainKey): ethers.JsonRpcProvider {
  if (!providerCache[chain]) {
    providerCache[chain] = new ethers.JsonRpcProvider(CHAINS[chain].rpcUrl, CHAINS[chain].chainId);
  }
  return providerCache[chain]!;
}

function getSigner(mnemonic: string, chain: ChainKey): ethers.HDNodeWallet {
  const hdWallet = ethers.HDNodeWallet.fromPhrase(mnemonic.trim(), undefined, DERIVATION_PATH);
  return hdWallet.connect(getProvider(chain));
}

export async function getBalance(address: string, chain: ChainKey): Promise<string> {
  const provider = getProvider(chain);
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

export interface SendResult {
  hash: string;
}

export async function sendNativeToken(
  mnemonic: string,
  chain: ChainKey,
  toAddress: string,
  amount: string
): Promise<SendResult> {
  if (!ethers.isAddress(toAddress)) {
    throw new Error('Invalid recipient address');
  }
  const signer = getSigner(mnemonic, chain);
  const tx = await signer.sendTransaction({
    to: toAddress,
    value: ethers.parseEther(amount),
  });
  return { hash: tx.hash };
}

export async function estimateGasFee(chain: ChainKey): Promise<string> {
  const provider = getProvider(chain);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? 0n;
  const estimatedGasLimit = 21000n; // simple native transfer
  return ethers.formatEther(gasPrice * estimatedGasLimit);
}
