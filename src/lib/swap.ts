import { ethers } from 'ethers';
import { ChainKey } from './chains';
import { getProvider, getSigner } from './wallet';

// Uniswap-V2-style routers: the oldest, simplest, most stable DEX interface
// (unchanged for years), called directly on-chain — no aggregator API or key.
// Mainnet only: testnet DEX deployments don't have reliable liquidity.
const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)',
];

const FACTORY_ABI = ['function getPair(address tokenA, address tokenB) view returns (address pair)'];

const PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
];

const ERC20_ALLOWANCE_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

export interface DexConfig {
  name: string;
  router: string;
  factory: string;
  wrappedNative: string;
}

const DEX_CONFIG: Partial<Record<ChainKey, DexConfig>> = {
  ethereum: {
    name: 'Uniswap V2',
    router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    wrappedNative: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  bsc: {
    name: 'PancakeSwap V2',
    router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    wrappedNative: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  },
  polygon: {
    name: 'QuickSwap',
    router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    wrappedNative: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  },
};

export function isSwapSupported(chain: ChainKey): boolean {
  return chain in DEX_CONFIG;
}

export function getDexConfig(chain: ChainKey): DexConfig {
  const config = DEX_CONFIG[chain];
  if (!config) throw new Error('Swap is not supported on this network');
  return config;
}

// asset: null means the chain's native coin (ETH/BNB/MATIC), which V2
// routers only accept in "wrapped" form when building a swap path.
function resolvePathAddress(chain: ChainKey, asset: string | null): string {
  return asset ?? getDexConfig(chain).wrappedNative;
}

export interface SwapQuote {
  amountOut: bigint;
  path: string[];
  priceImpactPercent: number | null;
}

export async function getSwapQuote(
  chain: ChainKey,
  tokenIn: string | null,
  tokenOut: string | null,
  amountIn: bigint
): Promise<SwapQuote> {
  const dex = getDexConfig(chain);
  const provider = getProvider(chain);
  const router = new ethers.Contract(dex.router, ROUTER_ABI, provider);
  const path = [resolvePathAddress(chain, tokenIn), resolvePathAddress(chain, tokenOut)];

  const amounts: bigint[] = await router.getAmountsOut(amountIn, path);
  const amountOut = amounts[amounts.length - 1];

  let priceImpactPercent: number | null = null;
  try {
    const factory = new ethers.Contract(dex.factory, FACTORY_ABI, provider);
    const pairAddress: string = await factory.getPair(path[0], path[1]);
    if (pairAddress !== ethers.ZeroAddress) {
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
      const [reserves, token0]: [[bigint, bigint, number], string] = await Promise.all([
        pair.getReserves(),
        pair.token0(),
      ]);
      const [reserveIn, reserveOut] =
        token0.toLowerCase() === path[0].toLowerCase() ? [reserves[0], reserves[1]] : [reserves[1], reserves[0]];
      const midPrice = Number(reserveOut) / Number(reserveIn);
      const execPrice = Number(amountOut) / Number(amountIn);
      priceImpactPercent = ((midPrice - execPrice) / midPrice) * 100;
    }
  } catch {
    // price impact is best-effort; a quote without it is still usable
  }

  return { amountOut, path, priceImpactPercent };
}

export async function getSwapAllowance(chain: ChainKey, tokenAddress: string, owner: string): Promise<bigint> {
  const provider = getProvider(chain);
  const token = new ethers.Contract(tokenAddress, ERC20_ALLOWANCE_ABI, provider);
  const dex = getDexConfig(chain);
  return token.allowance(owner, dex.router);
}

export interface ApproveResult {
  hash: string;
}

// Approves the exact amount needed for this swap (not unlimited) — costs an
// extra approval transaction on the next swap of the same token, but avoids
// leaving a standing unlimited allowance on the router.
export async function approveTokenForSwap(
  mnemonic: string,
  chain: ChainKey,
  tokenAddress: string,
  amount: bigint
): Promise<ApproveResult> {
  const dex = getDexConfig(chain);
  const signer = getSigner(mnemonic, chain);
  const token = new ethers.Contract(tokenAddress, ERC20_ALLOWANCE_ABI, signer);
  const tx = await token.approve(dex.router, amount);
  await tx.wait(1); // must be mined before the swap tx is submitted, or it will fail
  return { hash: tx.hash };
}

export interface ExecuteSwapResult {
  hash: string;
}

export async function executeSwap(
  mnemonic: string,
  chain: ChainKey,
  tokenIn: string | null,
  tokenOut: string | null,
  amountIn: bigint,
  amountOutMin: bigint,
  path: string[]
): Promise<ExecuteSwapResult> {
  const dex = getDexConfig(chain);
  const signer = getSigner(mnemonic, chain);
  const router = new ethers.Contract(dex.router, ROUTER_ABI, signer);
  const deadline = Math.floor(Date.now() / 1000) + 20 * 60; // 20 minutes

  let tx;
  if (tokenIn === null) {
    tx = await router.swapExactETHForTokens(amountOutMin, path, signer.address, deadline, { value: amountIn });
  } else if (tokenOut === null) {
    tx = await router.swapExactTokensForETH(amountIn, amountOutMin, path, signer.address, deadline);
  } else {
    tx = await router.swapExactTokensForTokens(amountIn, amountOutMin, path, signer.address, deadline);
  }
  return { hash: tx.hash };
}
