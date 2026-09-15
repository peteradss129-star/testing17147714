import { ChainKey } from './chains';

// CoinGecko's free public endpoint, no API key needed. Only covers native
// coins (not custom tokens) and only makes sense for mainnet — testnet coins
// have no real market value.
const COINGECKO_IDS: Partial<Record<ChainKey, string>> = {
  ethereum: 'ethereum',
  bsc: 'binancecoin',
  polygon: 'matic-network',
  bitcoin: 'bitcoin',
  tron: 'tron',
};

export interface PriceInfo {
  usd: number;
  inr: number;
}

let cache: { data: Record<string, PriceInfo>; timestamp: number } | null = null;
const CACHE_TTL_MS = 60_000;

function mapToChainKeys(data: Record<string, PriceInfo>): Partial<Record<ChainKey, PriceInfo>> {
  const result: Partial<Record<ChainKey, PriceInfo>> = {};
  for (const [chainKey, coingeckoId] of Object.entries(COINGECKO_IDS)) {
    const price = data[coingeckoId];
    if (price) {
      result[chainKey as ChainKey] = price;
    }
  }
  return result;
}

export async function getNativePrices(): Promise<Partial<Record<ChainKey, PriceInfo>>> {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return mapToChainKeys(cache.data);
  }

  const ids = Object.values(COINGECKO_IDS).join(',');
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,inr`);
  if (!res.ok) throw new Error(`Failed to fetch prices (HTTP ${res.status})`);
  const data = await res.json();

  cache = { data, timestamp: now };
  return mapToChainKeys(data);
}

export function formatFiat(amount: number, currency: 'usd' | 'inr'): string {
  const symbol = currency === 'usd' ? '$' : '₹';
  return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: amount < 1 ? 4 : 2 })}`;
}
