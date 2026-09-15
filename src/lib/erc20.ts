import { ethers } from 'ethers';
import { ChainKey } from './chains';
import { getProvider, getSigner } from './wallet';

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

export async function fetchTokenMetadata(chain: ChainKey, tokenAddress: string): Promise<TokenMetadata> {
  if (!ethers.isAddress(tokenAddress)) {
    throw new Error('Invalid contract address');
  }
  const provider = getProvider(chain);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const [name, symbol, decimals] = await Promise.all([
    contract.name() as Promise<string>,
    contract.symbol() as Promise<string>,
    contract.decimals() as Promise<bigint>,
  ]);
  return { address: tokenAddress, name, symbol, decimals: Number(decimals) };
}

export async function getTokenBalance(
  chain: ChainKey,
  tokenAddress: string,
  walletAddress: string,
  decimals: number
): Promise<string> {
  const provider = getProvider(chain);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const balance = (await contract.balanceOf(walletAddress)) as bigint;
  return ethers.formatUnits(balance, decimals);
}

export interface SendTokenResult {
  hash: string;
}

export async function sendToken(
  mnemonic: string,
  chain: ChainKey,
  tokenAddress: string,
  toAddress: string,
  amount: string,
  decimals: number
): Promise<SendTokenResult> {
  if (!ethers.isAddress(toAddress)) {
    throw new Error('Invalid recipient address');
  }
  const signer = getSigner(mnemonic, chain);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const tx = await contract.transfer(toAddress, ethers.parseUnits(amount, decimals));
  return { hash: tx.hash };
}
